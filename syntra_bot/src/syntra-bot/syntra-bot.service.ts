import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { VybeIntegrationService } from 'src/vybe-integration/vybe-integration.service';
import {
  welcomeMessageMarkup,
  tokenDisplayMarkup,
  menuMarkup,
} from './markups';
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
    this.syntraBot.on('callback_query', this.handleButtonCommands);
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
      const regexTrade = /^\/start ca-([a-zA-Z0-9]+)$/;
      const matchTrade = msg.text.trim().match(regexTrade);
      //   const deleteRegexTrack = /^\/start del-([a-zA-Z0-9]+)$/;
      //   const matchDelete = msg.text.trim().match(deleteRegexTrack);
      const regexX = /^\/start x-([1-9A-HJ-NP-Za-km-z]{32,44})$/;
      const matchX = msg.text.trim().match(regexX);

      if (matchTrade) {
        await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);

        console.log(matchTrade[1]);
        return;
      }
      if (command === '/start') {
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

  handleButtonCommands = async (query: any) => {
    this.logger.debug(query);
    let command: string;
    let tokenAddress: string;
    let buy_addressCommand: string;
    const currentText = query.message!.text || '';
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
      const parsedData = JSON.parse(query.data);
      if (parsedData.c) {
        buy_addressCommand = parsedData.c;
        [command, tokenAddress] = buy_addressCommand.split('|');
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

        case '/close':
          await this.syntraBot.sendChatAction(query.message.chat.id, 'typing');
          return await this.syntraBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

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
        svmWalletAddress: newSVMWallet.address,
        svmWalletDetails: encryptedSVMWalletDetails.json,
      });

      return await user.save();
    } catch (error) {
      console.log(error);
    }
  };

  normalizeHtml(input: string): string {
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
