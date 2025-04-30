import { HttpService } from '@nestjs/axios';
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { VybeIntegrationService } from 'src/vybe-integration/vybe-integration.service';
import {
  welcomeMessageMarkup,
  tokenDisplayMarkup,
  menuMarkup,
  walletFeaturesMarkup,
  exportWalletWarningMarkup,
  displayPrivateKeyMarkup,
  resetWalletWarningMarkup,
  manageAssetMarkup,
  settingsMarkup,
  sellTokenMarkup,
  buyTokenMarkup,
  transactionHistoryMarkup,
  walletAlertNotificationMarkup,
} from './markups';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/database/schemas/user.schema';
import { Model } from 'mongoose';
import { WalletService } from 'src/wallet/wallet.service';
import { Session, SessionDocument } from 'src/database/schemas/session.schema';
// import { TokenData } from 'src/vybe-integration/interfaces';
import { Assets } from 'src/database/schemas/userAsset.schema';
import { SyntraDexService } from 'src/syntra-dex/syntra-dex.service';
import { Transaction } from 'src/database/schemas/transaction.schema';
import {
  TrackedWallet,
  TrackedWalletDocument,
} from 'src/database/schemas/trackedWallet.schema';
import { VybeWebSocketService } from 'src/vybe-integration/vybe-websocket';
import { TrackingAlert } from 'src/vybe-integration/interfaces';

interface Token {
  tokenMint: string;
  amount: number;
}

const token = process.env.TELEGRAM_TOKEN;
@Injectable()
export class SyntraBotService {
  private readonly syntraBot: TelegramBot;
  private logger = new Logger(SyntraBotService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    @Inject(forwardRef(() => VybeIntegrationService))
    private readonly vybeService: VybeIntegrationService,
    @Inject(forwardRef(() => VybeWebSocketService))
    private readonly vybeWebsocketService: VybeWebSocketService,
    @Inject(forwardRef(() => SyntraDexService))
    private readonly syntraDexService: SyntraDexService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(Assets.name) private readonly assetsModel: Model<Assets>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(TrackedWallet.name)
    private readonly trackedWalletModel: Model<TrackedWallet>,
  ) {
    this.syntraBot = new TelegramBot(token, { polling: true });
    this.syntraBot.on('message', this.handleRecievedMessages);
    this.syntraBot.on('callback_query', this.handleButtonCommands);
  }

  handleRecievedMessages = async (msg: any) => {
    this.logger.debug(msg);
    try {
      if (!msg.text) {
        return;
      }

      const [user, session] = await Promise.all([
        this.userModel.findOne({ chatId: msg.chat.id }),
        this.sessionModel.findOne({ chatId: msg.chat.id }),
      ]);

      console.log(msg.text);
      const command = msg.text.trim();
      const mintRegex = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/;
      const match = command.match(mintRegex);
      const regexAmount = /^\d+(\.\d+)?$/;
      const regexTrade = /^\/start ca-([a-zA-Z0-9]+)$/;
      const matchTrade = msg.text.trim().match(regexTrade);
      const regexPosition = /\/start\s+position_([a-zA-Z0-9]{43,})/;
      const matchPosition = msg.text.trim().match(regexPosition);
      const deleteRegexTrack = /^\/start del-([a-zA-Z0-9]+)$/;
      const matchDelete = msg.text.trim().match(deleteRegexTrack);
      const regexX = /^\/start x-([1-9A-HJ-NP-Za-km-z]{32,44})$/;
      const matchX = msg.text.trim().match(regexX);
      const matchTrack = msg.text.trim().match(/\/track\s+(\w{32,44})/);

      if (matchTrack && msg.chat.type === 'private') {
        await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
        const wallet = await this.addOrUpdateTrackedWallets(
          matchTrack[1],
          msg.chat.id,
        );
        if (wallet) {
          await this.sessionModel.deleteMany({ chatId: msg.chat.id });
          const message = `
      ✅  <code>${wallet.walletAddress}</code>  has been added to your tracking list.\n📩 You will be notified when they make transactions.
    `;
          return await this.syntraBot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML',
          });
        }
        return;
      }
      if (matchPosition) {
        let loadingGif;
        try {
          await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
          const supportedTokens =
            await this.syntraDexService.fetchSupportedTokenPrice(
              matchPosition[1],
            );

          loadingGif = await this.syntraBot.sendAnimation(
            msg.chat.id,
            'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Q0aG52b3pmNm1iNWxyb254aHRnbWxvYzJjbDA4NzBwejBwdGZjZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTk9ZvMnbIiIew7IpW/giphy.gif',
            {
              caption: 'loading token data...',
            },
          );
          const tokenData = await this.vybeService.getTokenDetails(
            matchPosition[1],
          );
          console.log('supportedTokens:', supportedTokens);
          if (supportedTokens && tokenData) {
            const { balance: tokenBalance } =
              await this.walletService.getSPLTokenBalance(
                user.solWalletAddress,
                matchPosition[1],
                process.env.SOLANA_RPC,
                tokenData.decimal,
              );
            const { balance: solBalance } =
              await this.walletService.getSolBalance(
                user.solWalletAddress,
                process.env.SOLANA_RPC,
              );

            const buyToken = await sellTokenMarkup(
              tokenData,
              tokenBalance,
              solBalance,
            );
            const replyMarkup = { inline_keyboard: buyToken.keyboard };
            await this.syntraBot.sendMessage(msg.chat.id, buyToken.message, {
              reply_markup: replyMarkup,
              parse_mode: 'HTML',
            });
            await this.syntraBot.deleteMessage(
              msg.chat.id,
              loadingGif.message_id,
            );
            return;
          }
          console.log('contract address :', matchPosition[1]);
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
          await this.syntraBot.sendMessage(
            msg.chat.id,
            'Token not found/ supported',
          );
          await this.syntraBot.deleteMessage(
            msg.chat.id,
            loadingGif.message_id,
          );
          return;
        } catch (error) {
          console.error(error);
          await this.syntraBot.deleteMessage(
            msg.chat.id,
            loadingGif.message_id,
          );
        }
      }
      if (matchTrade) {
        let loadingGif;
        try {
          await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
          const supportedTokens =
            await this.syntraDexService.fetchSupportedTokenPrice(matchTrade[1]);

          loadingGif = await this.syntraBot.sendAnimation(
            msg.chat.id,
            'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Q0aG52b3pmNm1iNWxyb254aHRnbWxvYzJjbDA4NzBwejBwdGZjZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTk9ZvMnbIiIew7IpW/giphy.gif',
            {
              caption: 'loading token data...',
            },
          );
          const tokenData = await this.vybeService.getTokenDetails(
            matchTrade[1],
          );
          console.log('supportedTokens:', supportedTokens);
          if (supportedTokens && tokenData) {
            const { balance: solBalance } =
              await this.walletService.getSolBalance(
                user.solWalletAddress,
                process.env.SOLANA_RPC,
              );

            const buyToken = await buyTokenMarkup(tokenData, solBalance);
            const replyMarkup = { inline_keyboard: buyToken.keyboard };
            await this.syntraBot.sendMessage(msg.chat.id, buyToken.message, {
              reply_markup: replyMarkup,
              parse_mode: 'HTML',
            });
            await this.syntraBot.deleteMessage(
              msg.chat.id,
              loadingGif.message_id,
            );
            return;
          }
          console.log('contract address :', matchTrade[1]);
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
          await this.syntraBot.sendMessage(
            msg.chat.id,
            'Token not found/ supported',
          );
          await this.syntraBot.deleteMessage(
            msg.chat.id,
            loadingGif.message_id,
          );
          return;
        } catch (error) {
          console.error(error);
          await this.syntraBot.deleteMessage(
            msg.chat.id,
            loadingGif.message_id,
          );
        }
      }
      if (matchDelete) {
        await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
        return await this.removeChatIdFromTrackedWallet(
          matchDelete[1],
          msg.chat.id,
        );
      }
      if (command === '/start' && msg.chat.type === 'private') {
        const username = `${msg.from.username}`;
        const userExist = await this.userModel.findOne({ chatId: msg.chat.id });
        if (userExist) {
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
          const welcome = await welcomeMessageMarkup(username);
          const replyMarkup = { inline_keyboard: welcome.keyboard };

          return await this.syntraBot.sendMessage(
            msg.chat.id,
            welcome.message,
            { parse_mode: 'HTML', reply_markup: replyMarkup },
          );
        }
        const saved = await this.saveUserToDB(msg.chat.id, username);

        const welcome = await welcomeMessageMarkup(username);
        const replyMarkup = { inline_keyboard: welcome.keyboard };

        if (welcome && saved) {
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');

          await this.syntraBot.sendMessage(msg.chat.id, welcome.message, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        } else {
          await this.syntraBot.sendMessage(
            msg.chat.id,
            'There was an error saving your data, Please click the button below to try again.\n\nclick on /start',
          );
        }
      }
      if (command === '/menu' && msg.chat.type === 'private') {
        await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
        const allFeatures = await menuMarkup();
        if (allFeatures) {
          const replyMarkup = { inline_keyboard: allFeatures.keyboard };
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            allFeatures.message,
            {
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
            },
          );
        }
        return;
      }
      if (command === '/cancel' && msg.chat.type === 'private') {
        await this.sessionModel.deleteMany({ chatId: msg.chat.id });
        return await this.syntraBot.sendMessage(
          msg.chat.id,
          ' ✅All  active sessions closed successfully',
        );
      }
      if (
        (match || matchX) &&
        (msg.chat.type === 'private' ||
          msg.chat.type === 'group' ||
          msg.chat.type === 'supergroup')
      ) {
        if (matchX) {
          await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
        }
        if (session && session.trackWallet) {
          console.log('session:', session);
          const trackedWallet = await this.addOrUpdateTrackedWallets(
            match?.[0],
            msg.chat.id,
          );
          if (trackedWallet) {
            return await this.syntraBot.sendMessage(
              msg.chat.id,
              'This wallet is already being tracked\n click /cancel to cancel current session',
            );
          }
          const newTrackedWallet = await this.addOrUpdateTrackedWallets(
            match?.[0],
            msg.chat.id,
          );
          if (newTrackedWallet) {
            await this.sessionModel.deleteMany({ chatId: msg.chat.id });
            return await this.syntraBot.sendMessage(
              msg.chat.id,
              `✅  <code>${token}</code>  has been added to your tracking list.\n📩 You will be notified when they make transactions.`,
              {
                parse_mode: 'HTML',
              },
            );
          }
        }
        const loadingGif = await this.syntraBot.sendAnimation(
          msg.chat.id,
          'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Q0aG52b3pmNm1iNWxyb254aHRnbWxvYzJjbDA4NzBwejBwdGZjZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTk9ZvMnbIiIew7IpW/giphy.gif',
          {
            caption: 'Fetching data...',
          },
        );
        try {
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
          const token = match?.[0] || matchX?.[1];
          const data = await this.vybeService.getTokenReport(token);
          if (!data.tokenDetail || !data.topHolders) {
            await this.syntraBot.deleteMessage(
              msg.chat.id,
              loadingGif.message_id,
            );
            await this.syntraBot.sendMessage(
              msg.chat.id,
              'No token data found',
            );
            return;
          }
          const tokenDetail = await tokenDisplayMarkup(
            data.tokenDetail,
            data.topHolders,
          );

          const replyMarkup = { inline_keyboard: tokenDetail.keyboard };

          if (matchX) {
            await this.syntraBot.deleteMessage(
              msg.chat.id,
              loadingGif.message_id,
            );
            return await this.syntraBot.sendMessage(
              msg.chat.id,
              tokenDetail.message,
              {
                reply_markup: replyMarkup,
                parse_mode: 'HTML',
              },
            );
          }

          await this.syntraBot.deleteMessage(
            msg.chat.id,
            loadingGif.message_id,
          );
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            tokenDetail.message,
            {
              reply_markup: replyMarkup,
              parse_mode: 'HTML',
              reply_to_message_id: msg.message_id,
            },
          );
        } catch (error) {
          // await this.syntraBot.deleteMessage(
          //   msg.chat.id,
          //   loadingGif.message_id,
          // );
          console.error(error);
          await this.syntraBot.sendMessage(
            msg.chat.id,
            'Sorry error processing your request',
          );
          this.logger.warn(error);
        }
      }
      if (regexAmount.test(msg.text.trim()) && session.buySlippage) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (regexAmount.test(msg.text.trim()) && session.sellSlippage) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (regexAmount.test(msg.text.trim()) && session.tokenAmount) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (regexAmount.test(msg.text.trim()) && session.sellAmount) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (regexAmount.test(msg.text.trim()) && session.sellAlertAmount) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (regexAmount.test(msg.text.trim()) && session.buyAlertAmount) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (
        msg.text.trim() === '/trackedWallets' &&
        msg.chat.type === 'private'
      ) {
        return await this.listTrackedWallets(msg.chat.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  //handler for users inputs
  handleUserTextInputs = async (
    msg: TelegramBot.Message,
    session?: SessionDocument,
    // user?: UserDocument,
  ) => {
    await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
    try {
      const regexAmount = /^\d+(\.\d+)?$/;
      console.log(msg.text.trim());

      if (regexAmount.test(msg.text.trim()) && session.buySlippage) {
        const updatedUser = await this.userModel.findOneAndUpdate(
          { chatId: msg.chat.id },
          { buySlippage: msg.text.trim() },
          { new: true },
        );
        if (updatedUser) {
          const setting = await settingsMarkup(
            updatedUser.buySlippage,
            updatedUser.sellSlippage,
            updatedUser.buyAlertAmount,
            updatedUser.sellAlertAmount,
            updatedUser.tracking,
          );
          const replyMarkup = { inline_keyboard: setting.keyboard };

          await this.syntraBot.editMessageReplyMarkup(replyMarkup, {
            chat_id: msg.chat.id,
            message_id: session.messageId,
          });
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            `✅ Buy Slippage set to ${msg.text.trim()}%`,
          );
        }
        return;
      }
      if (regexAmount.test(msg.text.trim()) && session.sellSlippage) {
        const updatedUser = await this.userModel.findOneAndUpdate(
          { chatId: msg.chat.id },
          { sellSlippage: msg.text.trim() },
          { new: true },
        );
        if (updatedUser) {
          const setting = await settingsMarkup(
            updatedUser.buySlippage,
            updatedUser.sellSlippage,
            updatedUser.buyAlertAmount,
            updatedUser.sellAlertAmount,
            updatedUser.tracking,
          );
          const replyMarkup = { inline_keyboard: setting.keyboard };

          await this.syntraBot.editMessageReplyMarkup(replyMarkup, {
            chat_id: msg.chat.id,
            message_id: session.messageId,
          });
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            `✅ Sell Slippage set to ${msg.text.trim()}%`,
          );
        }
        return;
      }
      if (regexAmount.test(msg.text.trim()) && session.sellAmount) {
        //TODO: CALL sell SWAP FUNCTION HERE
        const user = await this.userModel.findOne({
          chatId: msg.chat.id,
        });
        const encryptedSVMWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.solWalletDetails,
        );
        if (encryptedSVMWallet.privateKey) {
          const swapHash = await this.syntraDexService.botSellToken(
            encryptedSVMWallet.privateKey,
            session.sellTokenAmountAddress,
            msg.text.trim(),
            msg.chat.id,
          );
          if (swapHash) {
            return await this.syntraBot.sendMessage(msg.chat.id, swapHash);
          }
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            'Transaction error, please Try again',
          );
        }
      }
      if (regexAmount.test(msg.text.trim()) && session.tokenAmount) {
        //TODO: CALL SWAP FUNCTION HERE
        const user = await this.userModel.findOne({
          chatId: msg.chat.id,
        });
        const encryptedSVMWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.solWalletDetails,
        );
        if (encryptedSVMWallet.privateKey) {
          const swapHash = await this.syntraDexService.botBuyToken(
            encryptedSVMWallet.privateKey,
            session.tokenAmountAddress,
            msg.text.trim(),
            msg.chat.id,
          );
          if (swapHash) {
            return await this.syntraBot.sendMessage(msg.chat.id, swapHash);
          }
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            'Transaction error, please Try again',
          );
        }
      }
      if (regexAmount.test(msg.text.trim()) && session.sellAlertAmount) {
        const updatedUser = await this.userModel.findOneAndUpdate(
          { chatId: msg.chat.id },
          { sellAlertAmount: msg.text.trim(), tracking: true },
          { new: true },
        );
        if (updatedUser) {
          const setting = await settingsMarkup(
            updatedUser.buySlippage,
            updatedUser.sellSlippage,
            updatedUser.buyAlertAmount,
            updatedUser.sellAlertAmount,
            updatedUser.tracking,
          );
          const replyMarkup = { inline_keyboard: setting.keyboard };

          await this.syntraBot.editMessageReplyMarkup(replyMarkup, {
            chat_id: msg.chat.id,
            message_id: session.messageId,
          });
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            `✅  Wallet Tracking sell alert amount  to ${msg.text.trim()} units.. and tracking is now ON\n\n you can turn off tracking by going to the settings menu`,
          );
        }
        return;
      }
      if (regexAmount.test(msg.text.trim()) && session.buyAlertAmount) {
        const updatedUser = await this.userModel.findOneAndUpdate(
          { chatId: msg.chat.id },
          { buyAlertAmount: msg.text.trim(), tracking: true },
          { new: true },
        );
        if (updatedUser) {
          const setting = await settingsMarkup(
            updatedUser.buySlippage,
            updatedUser.sellSlippage,
            updatedUser.buyAlertAmount,
            updatedUser.sellAlertAmount,
            updatedUser.tracking,
          );
          const replyMarkup = { inline_keyboard: setting.keyboard };

          await this.syntraBot.editMessageReplyMarkup(replyMarkup, {
            chat_id: msg.chat.id,
            message_id: session.messageId,
          });
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            `✅ Wallet Tracking buy alert amount set to ${msg.text.trim()} units.. and tracking is now ON\n\n you can turn off tracking by going to the settings menu`,
          );
        }
        return;
      }

      if (session) {
        // update users answerId
        await this.sessionModel.updateOne(
          { _id: session._id },
          { $push: { userInputId: msg.message_id } },
        );
      }

      // parse incoming message and handle commands
    } catch (error) {
      console.log(error);
    }
  };

  handleButtonCommands = async (query: any) => {
    this.logger.debug(query);
    let command: string;
    let tokenAddress: string;
    let buy_addressCommand: string;
    let sell_addressCommand: string;
    let sell_amountPerc: number;
    let buy_amount: number;
    const currentText = query.message!.text || '';
    let parsedData;
    // console.log(currentText);

    function isJSON(str) {
      try {
        JSON.parse(str);
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    }

    if (isJSON(query.data)) {
      parsedData = JSON.parse(query.data);
      if (parsedData.c) {
        buy_addressCommand = parsedData.c;
        buy_amount = parsedData.a;
        [command, tokenAddress] = buy_addressCommand.split('|');
      } else if (parsedData.s) {
        sell_addressCommand = parsedData.s;
        sell_amountPerc = parsedData.a;
        [command, tokenAddress] = sell_addressCommand.split('|');
      } else if (parsedData.command) {
        command = parsedData.command;
      }
    } else {
      command = query.data;
    }

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    try {
      console.log(command);
      const user = await this.userModel.findOne({ chatId: chatId });
      let session: SessionDocument;
      switch (command) {
        case '/menu':
          await this.syntraBot.sendChatAction(query.message.chat.id, 'typing');
          const allFeatures = await menuMarkup();
          if (allFeatures) {
            const replyMarkup = { inline_keyboard: allFeatures.keyboard };
            return await this.syntraBot.sendMessage(
              chatId,
              allFeatures.message,
              {
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
              },
            );
          }
          return;

        case '/refresh':
          await this.syntraBot.sendChatAction(chatId, 'typing');
          const loadingGif = await this.syntraBot.sendAnimation(
            chatId,
            'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Q0aG52b3pmNm1iNWxyb254aHRnbWxvYzJjbDA4NzBwejBwdGZjZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTk9ZvMnbIiIew7IpW/giphy.gif',
            {
              caption: 'refreshing data...',
              reply_to_message_id: messageId,
            },
          );
          try {
            const data = await this.vybeService.getTokenReport(tokenAddress);
            if (!data.tokenDetail || !data.topHolders) {
              return;
            }
            const updatedMarkup = await tokenDisplayMarkup(
              data.tokenDetail,
              data.topHolders,
            );
            const strippedBlockquote = this.normalizeHtml(
              updatedMarkup.message,
            );
            console.log(strippedBlockquote);

            // Compare new message and keyboard with current
            const isMessageSame = strippedBlockquote === currentText;
            console.log(isMessageSame);
            if (isMessageSame) {
              await this.syntraBot.deleteMessage(chatId, loadingGif.message_id);
              return;
            }

            const replyMarkup = { inline_keyboard: updatedMarkup.keyboard };

            await this.syntraBot.editMessageText(updatedMarkup.message, {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
            });
            await this.syntraBot.deleteMessage(chatId, loadingGif.message_id);
          } catch (error) {
            await this.syntraBot.deleteMessage(chatId, loadingGif.message_id);
            console.error('Refresh error:', error);
            await this.syntraBot.sendMessage(
              chatId,
              'Failed to refresh token data.',
              {
                reply_to_message_id: messageId,
              },
            );
          }
          break;

        case '/walletFeatures':
          await this.syntraBot.sendChatAction(chatId, 'typing');
          try {
            const { balance } = await this.walletService.getSolBalance(
              user.solWalletAddress,
              process.env.SOLANA_RPC,
            );
            await this.sendAllWalletFeature(chatId, user, balance);
            return;
          } catch (error) {
            console.log(error);
            return;
          }

        case '/fundWallet':
          try {
            await this.syntraBot.sendChatAction(
              query.message.chat.id,
              'typing',
            );

            if (user?.solWalletAddress) {
              const { balance } = await this.walletService.getSolBalance(
                user.solWalletAddress,
                process.env.SOLANA_RPC,
              );
              let message = 'Your wallet Address:\n';

              if (user?.solWalletAddress) {
                message += `<b><code>${user.solWalletAddress}</code></b>\nbalance: ${balance} SOL\n\n`;
              }

              message += 'Send SOL to your address above.';

              return await this.syntraBot.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Close ❌',
                        callback_data: JSON.stringify({
                          command: '/close',
                          language: 'english',
                        }),
                      },
                    ],
                  ],
                },
              });
            }
            return await this.syntraBot.sendMessage(
              chatId,
              'You dont have any wallet Address to fund',
            );
          } catch (error) {
            console.log(error);
            return;
          }

        case '/exportWallet':
          if (!user!.solWalletAddress) {
            return this.syntraBot.sendMessage(
              chatId,
              `You Don't have a wallet`,
            );
          }
          return this.showExportWalletWarning(chatId);

        case '/confirmExportWallet':
          // delete any existing session if any
          await this.sessionModel.deleteMany({ chatId: chatId });
          // create a new session
          session = await this.sessionModel.create({
            chatId: chatId,
            exportWallet: true,
          });
          if (session && user!.solWalletDetails) {
            let decryptedSVMWallet;
            if (user!.solWalletDetails) {
              decryptedSVMWallet = await this.walletService.decryptSVMWallet(
                process.env.DEFAULT_WALLET_PIN!,
                user!.solWalletDetails,
              );
            }

            if (decryptedSVMWallet.privateKey) {
              const latestSession = await this.sessionModel.findOne({
                chatId: chatId,
              });
              const deleteMessagesPromises = [
                ...latestSession!.userInputId.map((id) =>
                  this.syntraBot.deleteMessage(chatId, id),
                ),
              ];

              // Execute all deletions concurrently
              await Promise.all(deleteMessagesPromises);

              // Display the decrypted private key to the user
              await this.displayWalletPrivateKey(
                chatId,
                decryptedSVMWallet.privateKey || '',
              );

              return;
            }

            // Delete the session after operations
            await this.sessionModel.deleteMany({ chatId: chatId });
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/resetWallet':
          return this.showResetWalletWarning(chatId);

        case '/confirmReset':
          // delete any existing session if any
          await this.sessionModel.deleteMany({ chatId: chatId });
          // create a new session
          session = await this.sessionModel.create({
            chatId: chatId,
            resetWallet: true,
          });
          if (session) {
            try {
              await this.syntraBot.sendChatAction(chatId, 'typing');
              if (!user) {
                return await this.syntraBot.sendMessage(
                  chatId,
                  'User not found. click /start.',
                );
              }

              const newSVMWallet = await this.walletService.createSVMWallet();
              const [encryptedSVMWalletDetails] = await Promise.all([
                this.walletService.encryptSVMWallet(
                  process.env.DEFAULT_WALLET_PIN!,
                  newSVMWallet.privateKey,
                ),
              ]);

              await this.userModel.updateOne(
                { chatId: chatId },
                {
                  $set: {
                    solWalletAddress: newSVMWallet.address,
                    solWalletDetails: encryptedSVMWalletDetails.json,
                  },
                },
              );

              await this.syntraBot.sendMessage(
                chatId,
                `Wallet deleted successfully.\n\n your new wallet: <code>${newSVMWallet.address}</code>`,
                { parse_mode: 'HTML' },
              );
              await this.sessionModel.deleteMany({ chatId: chatId });
              return;
            } catch (error) {
              console.log(error);
            }
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/manageAsset':
          if (!user?.solWalletAddress) {
            return this.syntraBot.sendMessage(
              chatId,
              `You don't have any wallet connected`,
            );
          }
          await this.getUserAssets(chatId, user.solWalletAddress);
          await this.displayWalletAssets(chatId, user.solWalletAddress);
          return;

        case '/refreshAsset':
          if (!user?.solWalletAddress) {
            return this.syntraBot.sendMessage(
              chatId,
              `You don't have any wallet connected`,
            );
          }
          await this.syntraBot.sendChatAction(chatId, 'typing');
          await this.syntraBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );
          await this.getUserAssets(chatId, user.solWalletAddress);
          await this.displayWalletAssets(chatId, user.solWalletAddress);
          return;

        case '/next':
          if (!user?.solWalletAddress) {
            return this.syntraBot.sendMessage(
              chatId,
              `You don't have any wallet connected`,
            );
          }
          const nextPage = parsedData.page;
          console.log(nextPage);
          const nextPageAssets = await this.displayWalletAssets(
            chatId,
            user.solWalletAddress,
            nextPage,
          );
          console.log(nextPageAssets);
          return;

        case '/prev':
          if (!user?.solWalletAddress) {
            return this.syntraBot.sendMessage(
              chatId,
              `You don't have any wallet connected`,
            );
          }
          const prevPage = parsedData.page;
          console.log(prevPage);
          const prevPageAssets = await this.displayWalletAssets(
            chatId,
            user.solWalletAddress,
            prevPage,
          );
          console.log(prevPageAssets);
          return;

        case '/settings':
          const setting = await settingsMarkup(
            user.buySlippage,
            user.sellSlippage,
            user.buyAlertAmount,
            user.sellAlertAmount,
            user.tracking,
          );
          const replyMarkup = { inline_keyboard: setting.keyboard };

          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            setting.message,
            { reply_markup: replyMarkup, parse_mode: 'HTML' },
          );

        case '/buyToken':
          await this.sessionModel.deleteMany({ chatId: chatId });
          await this.promptBuyToken(chatId);
          return;

        case '/trackWallet':
          await this.sessionModel.deleteMany({ chatId: chatId });
          session = await this.sessionModel.create({
            chatId: chatId,
            trackWallet: true,
            messageId: messageId,
          });
          if (session) {
            await this.promptTrackWallet(chatId);
            return;
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/buySlippage':
          await this.sessionModel.deleteMany({ chatId: chatId });
          session = await this.sessionModel.create({
            chatId: chatId,
            buySlippage: true,
            messageId: messageId,
          });
          if (session) {
            await this.promptBuySlippage(chatId);
            return;
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/sellSlippage':
          await this.sessionModel.deleteMany({ chatId: chatId });
          session = await this.sessionModel.create({
            chatId: chatId,
            sellSlippage: true,
            messageId: messageId,
          });
          if (session) {
            await this.promptSellSlippage(chatId);
            return;
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/sellAlertAmount':
          await this.sessionModel.deleteMany({ chatId: chatId });
          session = await this.sessionModel.create({
            chatId: chatId,
            sellAlertAmount: true,
            messageId: messageId,
          });
          if (session) {
            await this.promptSellAlertAmount(chatId);
            return;
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/buyAlertAmount':
          await this.sessionModel.deleteMany({ chatId: chatId });
          session = await this.sessionModel.create({
            chatId: chatId,
            buyAlertAmount: true,
            messageId: messageId,
          });
          if (session) {
            await this.promptBuyAlertAmount(chatId);
            return;
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/OnOffWalletTracking':
          await this.sessionModel.deleteMany({ chatId: chatId });
          let updatedUser;
          if (user.tracking) {
            updatedUser = await this.userModel.findOneAndUpdate(
              { chatId: chatId },
              { tracking: false },
              { new: true },
            );
          } else {
            updatedUser = await this.userModel.findOneAndUpdate(
              { chatId: chatId },
              { tracking: true },
              { new: true },
            );
          }
          const settingConfig = await settingsMarkup(
            updatedUser.buySlippage,
            updatedUser.sellSlippage,
            updatedUser.buyAlertAmount,
            updatedUser.sellAlertAmount,
            updatedUser.tracking,
          );
          const settingReplyMarkup = {
            inline_keyboard: settingConfig.keyboard,
          };

          await this.syntraBot.editMessageReplyMarkup(settingReplyMarkup, {
            chat_id: query.message.chat.id,
            message_id: messageId,
          });

          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `✅ Wallet tracking has been ${
              updatedUser.tracking ? 'enabled' : 'disabled'
            } successfully`,
          );

        case '/B':
          await this.syntraBot.sendChatAction(chatId, 'typing');
          const { balance } = await this.walletService.getSolBalance(
            user.solWalletAddress,
            process.env.SOLANA_RPC,
          );
          if (buy_amount == 0) {
            return await this.promptBuyAmount(
              query.message.chat.id,
              balance,
              tokenAddress,
            );
          } else {
            await this.sessionModel.deleteMany({
              chatId: query.message.chat.id,
            });
            //TODO: call swap function here
            const encryptedSVMWallet =
              await this.walletService.decryptSVMWallet(
                `${process.env.DEFAULT_WALLET_PIN}`,
                user.solWalletDetails,
              );

            if (encryptedSVMWallet.privateKey) {
              const swapHash = await this.syntraDexService.botBuyToken(
                encryptedSVMWallet.privateKey,
                tokenAddress,
                `${buy_amount}`,
                query.message.chat.id,
              );
              if (swapHash) {
                return await this.syntraBot.sendMessage(
                  query.message.chat.id,
                  swapHash,
                );
              }
              return await this.syntraBot.sendMessage(
                query.message.chat.id,
                'Transaction error, please Try again',
              );
            }
            return;
          }

        case '/S':
          await this.syntraBot.sendChatAction(chatId, 'typing');
          if (sell_amountPerc == 0) {
            return await this.promptSellPercentageAmount(
              query.message.chat.id,
              tokenAddress,
            );
          } else {
            await this.sessionModel.deleteMany({
              chatId: query.message.chat.id,
            });

            const encryptedSVMWallet =
              await this.walletService.decryptSVMWallet(
                `${process.env.DEFAULT_WALLET_PIN}`,
                user.solWalletDetails,
              );
            //TODO: call SELL swap function here
            if (encryptedSVMWallet.privateKey) {
              const swapHash = await this.syntraDexService.botSellToken(
                encryptedSVMWallet.privateKey,
                tokenAddress,
                `${sell_amountPerc}`,
                query.message.chat.id,
              );
              if (swapHash) {
                return await this.syntraBot.sendMessage(
                  query.message.chat.id,
                  swapHash,
                );
              }
              return await this.syntraBot.sendMessage(
                query.message.chat.id,
                'Transaction error, please Try again',
              );
            }
            return;
          }

        case '/transactionHistory':
          const userTransactions = await this.transactionModel.find({
            chatId: user.chatId,
          });

          if (userTransactions.length > 0) {
            const transactionHistory =
              await transactionHistoryMarkup(userTransactions);

            const replyMarkup = {
              inline_keyboard: transactionHistory.keyboard,
            };

            return await this.syntraBot.sendMessage(
              query.message.chat.id,
              transactionHistory.message,
              {
                reply_markup: replyMarkup,
                parse_mode: 'HTML',
              },
            );
          }
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Your have not performed any transaction..`,
          );

        case '/trackedWallets':
          return await this.listTrackedWallets(query.message.chat.id);

        case '/close':
          await this.syntraBot.sendChatAction(query.message.chat.id, 'typing');
          return await this.syntraBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

        //   close opened markup and delete session
        case '/closeDelete':
          await this.syntraBot.sendChatAction(query.message.chat.id, 'typing');
          await this.sessionModel.deleteMany({
            chatId: chatId,
          });
          return await this.syntraBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

        case '/neutral':
          return;

        default:
          return await this.syntraBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );
      }
    } catch (error) {
      console.log(error);
    }
  };

  saveUserToDB = async (chat_id: number, username: string) => {
    try {
      const newSVMWallet = await this.walletService.createSVMWallet();
      const [encryptedSVMWalletDetails] = await Promise.all([
        this.walletService.encryptSVMWallet(
          process.env.DEFAULT_WALLET_PIN!,
          newSVMWallet.privateKey,
        ),
      ]);
      const user = new this.userModel({
        chatId: chat_id,
        userName: username,
        solWalletAddress: newSVMWallet.address,
        solWalletDetails: encryptedSVMWalletDetails.json,
      });

      return await user.save();
    } catch (error) {
      console.log(error);
    }
  };

  sendAllWalletFeature = async (
    chatId: any,
    user: UserDocument,
    balance: number,
  ) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      const allWalletFeatures = await walletFeaturesMarkup(user, balance);
      if (allWalletFeatures) {
        const replyMarkup = {
          inline_keyboard: allWalletFeatures.keyboard,
        };
        await this.syntraBot.sendMessage(chatId, allWalletFeatures.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  showExportWalletWarning = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      const showExportWarning = await exportWalletWarningMarkup();
      if (showExportWarning) {
        const replyMarkup = { inline_keyboard: showExportWarning.keyboard };

        return await this.syntraBot.sendMessage(
          chatId,
          showExportWarning.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  displayWalletPrivateKey = async (
    chatId: TelegramBot.ChatId,
    privateKeySVM: string,
  ) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      const displayPrivateKey = await displayPrivateKeyMarkup(privateKeySVM);
      if (displayPrivateKey) {
        const replyMarkup = { inline_keyboard: displayPrivateKey.keyboard };

        const sendPrivateKey = await this.syntraBot.sendMessage(
          chatId,
          displayPrivateKey.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );
        if (sendPrivateKey) {
          // Delay the message deletion by 1 minute
          setTimeout(async () => {
            try {
              // Delete the message after 1 minute
              await this.syntraBot.deleteMessage(
                chatId,
                sendPrivateKey.message_id,
              );
            } catch (error) {
              console.error('Error deleting message:', error);
            }
          }, 60000);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  showResetWalletWarning = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      const showResetWarning = await resetWalletWarningMarkup();
      if (showResetWarning) {
        const replyMarkup = { inline_keyboard: showResetWarning.keyboard };

        return await this.syntraBot.sendMessage(
          chatId,
          showResetWarning.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  displayWalletAssets = async (
    chatId: TelegramBot.ChatId,
    address: string,
    page: number = 1,
  ) => {
    const loadingGif = await this.syntraBot.sendAnimation(
      chatId,
      'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Q0aG52b3pmNm1iNWxyb254aHRnbWxvYzJjbDA4NzBwejBwdGZjZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTk9ZvMnbIiIew7IpW/giphy.gif',
      {
        caption: 'Fetching data...',
      },
    );

    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');

      const { balance } = await this.walletService.getSolBalance(
        address,
        process.env.SOLANA_RPC,
      );
      const userAssets = await this.assetsModel.findOne({
        chatId: chatId,
      });
      if (!userAssets || !userAssets.assets.length) {
        await this.syntraBot.deleteMessage(chatId, loadingGif.message_id);
        return await this.syntraBot.sendMessage(chatId, 'No assets found.');
      }
      const allAssets = userAssets.assets;
      const totalAssets = allAssets.length;
      const pageSize = 10;

      const start = (page - 1) * pageSize;
      const end = Math.min(start + pageSize, totalAssets);
      const currentBatch = allAssets.slice(start, end);

      const assetDetails = await Promise.allSettled(
        currentBatch.map((asset: Token) =>
          this.vybeService.getTokenDetails(asset.tokenMint).then((details) => ({
            tokenMint: asset.tokenMint,
            amount: asset.amount,
            ...details,
          })),
        ),
      );
      const successful = assetDetails
        .filter((res) => res.status === 'fulfilled')
        .map((res) => (res as PromiseFulfilledResult<any>).value);
      // const failed = assetDetails
      //   .filter((res) => res.status === 'rejected')
      //   .map((res) => (res as PromiseRejectedResult).reason);

      const remaining = totalAssets - end;
      const assetMarkup = await manageAssetMarkup(
        successful,
        balance,
        page,
        remaining,
      );

      const replyMarkup = { inline_keyboard: assetMarkup.keyboard };
      const message = assetMarkup.message;

      await this.syntraBot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      await this.syntraBot.deleteMessage(chatId, loadingGif.message_id);
    } catch (error) {
      console.log(error);
      await this.syntraBot.deleteMessage(chatId, loadingGif.message_id);
    }
  };

  getUserAssets = async (chatId: TelegramBot.ChatId, wallet: string) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      const walletAssets = await this.walletService.getTokenBalances(wallet);
      return await this.assetsModel.findOneAndUpdate(
        { chatId },
        { $set: { assets: walletAssets } },
        { upsert: true, new: true },
      );
    } catch (error) {
      console.log('General error in showBalance:', error);
    }
  };

  promptBuyToken = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendMessage(
        chatId,
        `paste the token address you wish to buy`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptBuySlippage = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendMessage(
        chatId,
        `Reply with your new slippage setting for buys in % (0 - 100%). Example: 10`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptSellSlippage = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendMessage(
        chatId,
        `Reply with your new slippage setting for sells in % (0 - 100%). Example: 10`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptSellAlertAmount = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendMessage(
        chatId,
        `Reply with your new Wallet tracking token sell value. Example: 100`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptBuyAlertAmount = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendMessage(
        chatId,
        `Reply with your new Wallet tracking token buy value. Example: 100`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptSellPercentageAmount = async (
    chatId: TelegramBot.ChatId,
    tokenAddress: string,
  ) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      await this.sessionModel.deleteMany({ chatId: chatId });

      await this.sessionModel.create({
        chatId: chatId,
        sellAmount: true,
        sellTokenAmountAddress: tokenAddress,
      });
      await this.syntraBot.sendMessage(
        chatId,
        `Reply with the percentage amount you wish to sell (0 - 100 %)\nAfter submission, it will be sold immediately`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptBuyAmount = async (
    chatId: TelegramBot.ChatId,
    balance: any,
    tokenAddress: string,
  ) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      await this.sessionModel.deleteMany({ chatId: chatId });

      await this.sessionModel.create({
        chatId: chatId,
        tokenAmount: true,
        tokenAmountAddress: tokenAddress,
      });
      await this.syntraBot.sendMessage(
        chatId,
        `Reply with the amount of SOL you wish to buy(0 - ${balance}, E.g: 0.1)\nAfter submission, it will be bought immediately`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptTrackWallet = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');

      await this.syntraBot.sendMessage(
        chatId,
        `paste the wallet address you wish to track or reply with /track wallet adress (/track 7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU)`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  sendTransactionLoading = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.syntraBot.sendChatAction(chatId, 'typing');
      const loadingGif = await this.syntraBot.sendAnimation(
        chatId,
        'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2Q0aG52b3pmNm1iNWxyb254aHRnbWxvYzJjbDA4NzBwejBwdGZjZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xTk9ZvMnbIiIew7IpW/giphy.gif',
        {
          caption: 'Processing transaction...',
        },
      );

      return loadingGif.message_id;
    } catch (error) {
      console.error('Error sending message:', error);
      return;
    }
  };

  deleteTransactionLoadingGif = async (
    chatId: TelegramBot.ChatId,
    messageId: number,
  ) => {
    try {
      await this.syntraBot.deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      return;
    }
  };

  async addOrUpdateTrackedWallets(
    walletAddress: string,
    chatId: number,
  ): Promise<TrackedWalletDocument> {
    const updatedWallets = await this.trackedWalletModel.findOneAndUpdate(
      { walletAddress },
      {
        $addToSet: { chatId },
      },
      {
        new: true,
        upsert: true,
      },
    );
    await this.vybeWebsocketService.updateFilters();
    return updatedWallets;
  }

  async findTrackedWalletsByChatId(
    chatId: number,
  ): Promise<TrackedWalletDocument[]> {
    return this.trackedWalletModel.find({ chatId: chatId }).exec();
  }

  async listTrackedWallets(chatId: number): Promise<void> {
    const wallets = await this.findTrackedWalletsByChatId(chatId);

    let message: string;

    if (!wallets || wallets.length === 0) {
      message = 'You are not tracking any Wallet.';
    } else {
      message = '📋 <b>Your tracked Wallets:</b>\n\n';
      wallets.forEach((wallet, index) => {
        message += `${index + 1}. <code>${wallet.walletAddress}</code>\n(<a href="${process.env.BOT_URL}?start=del-${wallet.walletAddress}"> Delete 🚮</a>)\n`;
      });
    }

    try {
      await this.syntraBot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error(`Failed to send message to chatId ${chatId}:`, error);
      throw new Error('Failed to send message');
    }
  }

  async removeChatIdFromTrackedWallet(
    walletAddress: string,
    chatId: number,
  ): Promise<{ message: string }> {
    const result = await this.trackedWalletModel
      .findOneAndUpdate(
        { walletAddress, chatId },
        [
          {
            $set: {
              chatId: {
                $cond: {
                  if: { $eq: [{ $size: '$chatId' }, 1] },
                  then: [],
                  else: { $setDifference: ['$chatId', [chatId]] },
                },
              },
            },
          },
        ],
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(
        ` ${walletAddress} or chatId ${chatId} not found`,
      );
    }

    // If chatId array is empty, delete the document
    if (result.chatId.length === 0) {
      await this.trackedWalletModel.deleteOne({ walletAddress }).exec();
      await this.syntraBot.sendMessage(
        chatId,
        ` ${result.walletAddress} has been removed from your tracking list `,
      );
      await this.vybeWebsocketService.updateFilters();
      return;
    }
    await this.syntraBot.sendMessage(
      chatId,
      ` ${result.walletAddress} has been removed from your tracking list `,
    );
    await this.vybeWebsocketService.updateFilters();
    return;
  }
  async notifyUsers(notificationMessage: TrackingAlert, chatId: number) {
    try {
      const notifyUserMarkup =
        await walletAlertNotificationMarkup(notificationMessage);

      const replyMarkup = { inline_keyboard: notifyUserMarkup.keyboard };

      return await this.syntraBot.sendMessage(
        chatId,
        notifyUserMarkup.message,
        {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        },
      );
    } catch (error) {
      console.error('Error notifying users:', error);
    }
  }

  private normalizeHtml(input: string): string {
    return (
      input
        // Remove all HTML tags
        .replace(/<[^>]+>/g, '')
        // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
    );
  }
}
