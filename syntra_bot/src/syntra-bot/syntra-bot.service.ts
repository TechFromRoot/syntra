import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { VybeIntegrationService } from 'src/vybe-integration/vybe-integration.service';
import { welcomeMessageMarkup, tokenDisplayMarkup } from './markups';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/database/schemas/user.schema';
import { Model } from 'mongoose';
import { WalletService } from 'src/wallet/wallet.service';

const token = process.env.TELEGRAM_TOKEN;
@Injectable()
export class SyntraBotService {
  private readonly syntraBot: TelegramBot;
  private logger = new Logger(SyntraBotService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    private readonly vybeService: VybeIntegrationService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    this.syntraBot = new TelegramBot(token, { polling: true });
    this.syntraBot.on('message', this.handleRecievedMessages);
  }

  handleRecievedMessages = async (msg: any) => {
    this.logger.debug(msg);
    try {
      if (!msg.text) {
        return;
      }

      console.log(msg.text);
      const command = msg.text.trim();
      const mintRegex = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/;
      const match = command.match(mintRegex);
      //   const regexTrack = /^\/start ca-([a-zA-Z0-9]+)$/;
      //   const matchTrack = msg.text.trim().match(regexTrack);
      //   const deleteRegexTrack = /^\/start del-([a-zA-Z0-9]+)$/;
      //   const matchDelete = msg.text.trim().match(deleteRegexTrack);
      const regexX = /^\/start x-([1-9A-HJ-NP-Za-km-z]{32,44})$/;
      const matchX = msg.text.trim().match(regexX);

      //   if (matchTrack) {
      //     await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
      //     const { tokenDetail } = await this.vybeService.getTokenDetails(
      //       matchTrack[1],
      //     );
      //     console.log('contract address :', tokenDetail);
      //     if (!tokenDetail) {
      //       return;
      //     }
      //     const creator = await this.addOrUpdateCreator(
      //       tokenDetail.mint,
      //       tokenDetail.creator,
      //       tokenDetail.tokenMeta.symbol,
      //       msg.chat.id,
      //     );
      //     if (creator) {
      //       const message = `
      //   ✅ The creator wallet (<code>${creator.creatorAddress}</code>) for token ${creator.tokenSymbol} has been added to your tracking list.\n📩 You will be notified when the creator sells their tokens.
      // `;
      //       return await this.syntraBot.sendMessage(msg.chat.id, message, {
      //         parse_mode: 'HTML',
      //       });
      //     }
      //     return;
      //   }
      //   if (matchDelete) {
      //     await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
      //     return await this.removeChatIdFromCreator(matchDelete[1], msg.chat.id);
      //   }
      if (command === '/start') {
        const username = `${msg.from.username}`;
        const userExist = await this.userModel.findOne({ chatId: msg.chat.id });
        if (userExist) {
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
          const welcome = await welcomeMessageMarkup(username);

          return await this.syntraBot.sendMessage(
            msg.chat.id,
            welcome.message,
            { parse_mode: 'HTML' },
          );
        }
        const saved = await this.saveUserToDB(msg.chat.id);

        const welcome = await welcomeMessageMarkup(username);

        if (welcome && saved) {
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');

          await this.syntraBot.sendMessage(msg.chat.id, welcome.message, {
            parse_mode: 'HTML',
          });
        } else {
          await this.syntraBot.sendMessage(
            msg.chat.id,
            'There was an error saving your data, Please click the button below to try again.\n\nclick on /start',
          );
        }
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
    } catch (error) {
      console.error(error);
    }
  };

  saveUserToDB = async (chat_id: number, platform = 'telegram') => {
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
        platform,
        svmWalletAddress: newSVMWallet.address,
        svmWalletDetails: encryptedSVMWalletDetails.json,
      });

      return await user.save();
    } catch (error) {
      console.log(error);
    }
  };
}
