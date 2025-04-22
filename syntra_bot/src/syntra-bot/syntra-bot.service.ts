import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_TOKEN;
@Injectable()
export class SyntraBotService {
  private readonly syntraBot: TelegramBot;
  private logger = new Logger(SyntraBotService.name);

  constructor(private readonly httpService: HttpService) {
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
      const regexTrack = /^\/start ca-([a-zA-Z0-9]+)$/;
      const matchTrack = msg.text.trim().match(regexTrack);
      const deleteRegexTrack = /^\/start del-([a-zA-Z0-9]+)$/;
      const matchDelete = msg.text.trim().match(deleteRegexTrack);
      const regexX = /^\/start x-([1-9A-HJ-NP-Za-km-z]{32,44})$/;
      const matchX = msg.text.trim().match(regexX);

      if (matchTrack) {
        await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
        const { tokenDetail } = await this.rugCheckService.getTokenDetails(
          matchTrack[1],
        );
        console.log('contract address :', tokenDetail);
        if (!tokenDetail) {
          return;
        }
        const creator = await this.addOrUpdateCreator(
          tokenDetail.mint,
          tokenDetail.creator,
          tokenDetail.tokenMeta.symbol,
          msg.chat.id,
        );
        if (creator) {
          const message = `
      ✅ The creator wallet (<code>${creator.creatorAddress}</code>) for token ${creator.tokenSymbol} has been added to your tracking list.\n📩 You will be notified when the creator sells their tokens.
    `;
          return await this.syntraBot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML',
          });
        }
        return;
      }
      if (matchDelete) {
        await this.syntraBot.deleteMessage(msg.chat.id, msg.message_id);
        return await this.removeChatIdFromCreator(matchDelete[1], msg.chat.id);
      }
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
        try {
          const token = match?.[0] || matchX?.[1];
          const data = await this.rugCheckService.getTokenReport$Vote(token);
          if (!data.tokenDetail || !data.tokenVotes) {
            return;
          }
          const tokenDetail = await tokenDisplayMarkup(
            data.tokenDetail,
            data.tokenVotes,
          );

          const replyMarkup = { inline_keyboard: tokenDetail.keyboard };

          if (matchX) {
            return await this.syntraBot.sendMessage(
              msg.chat.id,
              tokenDetail.message,
              {
                reply_markup: replyMarkup,
                parse_mode: 'Markdown',
              },
            );
          }
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            tokenDetail.message,
            {
              reply_markup: replyMarkup,
              parse_mode: 'Markdown',
              reply_to_message_id: msg.message_id,
            },
          );
        } catch (error) {
          console.error(error);
          this.logger.warn(error);
        }
      }
      if (msg.text.trim() === '/creator_wallets') {
        return await this.listTrackedCreators(msg.chat.id);
      }
      if (msg.text.trim() === '/key') {
        const keyIndex = await this.callModel.findOne();

        if (!keyIndex) {
          await this.syntraBot.sendChatAction(msg.chat.id, 'typing');
          return await this.syntraBot.sendMessage(
            msg.chat.id,
            `There is no API Key`,
          );
        }
        const currentKeyIndex = keyIndex.call;
        // const currentApiKey = this.apiKeys[currentKeyIndex];

        return await this.syntraBot.sendMessage(
          msg.chat.id,
          `Current Key index is ${currentKeyIndex}`,
        );
      }
    } catch (error) {
      console.error(error);
    }
  };
}
