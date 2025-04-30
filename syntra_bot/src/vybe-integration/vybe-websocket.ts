import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrackedWallet } from 'src/database/schemas/trackedWallet.schema';
import { User, UserDocument } from 'src/database/schemas/user.schema';
import { SyntraBotService } from 'src/syntra-bot/syntra-bot.service';
import { WebSocket } from 'ws';
import { TrackingAlert } from './interfaces';
// import { WebSocketServer } from 'ws';

@Injectable()
export class VybeWebSocketService {
  private readonly logger = new Logger(VybeWebSocketService.name);
  private ws: WebSocket | null = null;
  private readonly websocketUri: string = process.env.VYBE_WEB_SOCKET;
  private readonly apiKey: string = process.env.VYBE_API_KEY;
  private readonly enableReconnect: boolean = true;

  constructor(
    @InjectModel(TrackedWallet.name)
    private readonly trackedWalletModel: Model<TrackedWallet>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @Inject(forwardRef(() => SyntraBotService))
    private readonly syntraBotService: SyntraBotService,
  ) {
    // this.connect();
  }

  private getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  private async getTrackedWallets(): Promise<string[]> {
    const trackedWallets = await this.trackedWalletModel.find();
    return trackedWallets.map((tw) => tw.walletAddress);
  }

  private async configureFilters(): Promise<void> {
    console.log('Configuring filters...');
    this.logger.log('Configuring filters...');
    const walletAddresses = await this.getTrackedWallets();

    if (!walletAddresses.length) {
      this.logger.warn('No wallets to track.');
      return;
    }
    // const walletAddresses = [
    //   '8MqRTAQnjhDYH7TWS1b1DjFog4CLZfySWE5cZeotG2VW',
    //   '7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU',
    //   'JD6rVaerbyz6wjQ433nrw6bFTgFrp46MiYmi8EtUAfsG',
    //   'Cy4YveF3TX6WZBVWbCDPHE4vLa1a9ZLngZqykrVEsBku',
    // ];
    const configureMessage = JSON.stringify({
      type: 'configure',
      filters: {
        // trades: walletAddresses.map((walletAddress) => ({
        //   feePayer: walletAddress,
        // })),
        transfers: walletAddresses.map((walletAddress) => ({
          feePayer: walletAddress,
        })),
      },
    });
    this.ws?.send(configureMessage);
    this.logger.log(
      `Configured filters for ${walletAddresses.length} wallets.`,
    );
  }

  private connect(): void {
    this.ws = new WebSocket(this.websocketUri, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    this.ws.on('open', async () => {
      this.logger.log(
        `Connected to WebSocket server at ${this.getTimestamp()}`,
      );
      await this.configureFilters();
    });

    this.ws.on('message', async (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        this.logger.log('Received message:', parsedMessage);
        await this.processTransferMessage(parsedMessage);
      } catch (error) {
        this.logger.error(`Failed to parse message: ${error.message}`);
      }
    });

    this.ws.on('close', () => {
      this.logger.warn('WebSocket connection closed.');
      if (this.enableReconnect) {
        this.attemptReconnect();
      }
    });

    this.ws.on('error', (error: Error) => {
      this.logger.error(`WebSocket error: ${error.message}`);
      if (this.enableReconnect) {
        this.attemptReconnect();
      }
    });
  }

  private async processTransferMessage(parsedMessage: any): Promise<void> {
    const {
      senderAddress,
      receiverAddress,
      amount,
      decimal,
      signature,
      mintAddress,
      blockTime,
    } = parsedMessage;
    const amountInTokens = amount / 10 ** decimal;

    // Check if the sender or receiver is a tracked wallet
    const trackedWallets = await this.getTrackedWallets();
    const isSenderTracked = trackedWallets.includes(senderAddress);
    const isReceiverTracked = trackedWallets.includes(receiverAddress);

    if (
      isSenderTracked &&
      mintAddress !== '11111111111111111111111111111111' &&
      mintAddress !== 'So11111111111111111111111111111111111111112'
    ) {
      const trackingDetails: TrackingAlert = {
        walletAddress: senderAddress,
        type: 'sold',
        amount: amountInTokens,
        signature,
        mintAddress,
        timestamp: blockTime,
      };
      // Sell: Tracked wallet is the sender
      // const notificationMessage = `${senderAddress} sold ${amountInTokens} ${mintAddress} tokens (signature: ${signature})`;
      await this.notifyUsers(senderAddress, trackingDetails);
    }

    if (
      isReceiverTracked &&
      mintAddress !== '11111111111111111111111111111111' &&
      mintAddress !== 'So11111111111111111111111111111111111111112'
    ) {
      const trackingDetails: TrackingAlert = {
        walletAddress: receiverAddress,
        type: 'bought',
        amount: amountInTokens,
        signature,
        mintAddress,
        timestamp: blockTime,
      };
      // Buy: Tracked wallet is the receiver
      // const notificationMessage = `${receiverAddress} bought ${amountInTokens} ${mintAddress} tokens (signature: ${signature})`;
      await this.notifyUsers(receiverAddress, trackingDetails);
    }
  }

  private async notifyUsers(
    walletAddress: string,
    message: TrackingAlert,
  ): Promise<void> {
    // Find users tracking this wallet
    const Users = await this.getUsersTrackingWallet(walletAddress);
    if (!Users || Users.length === 0) {
      this.logger.warn(`No users tracking wallet: ${walletAddress}`);
      return;
    }
    const userIds = Users.map((user) => user.chatId);
    console.log('Notifying users...,userIds:', userIds);
    // const userIds = trackedWallets.flatMap((tw) => tw.chatId); // Ensures it's a flat array

    await Promise.allSettled(
      Users.map(async (user) => {
        try {
          if (
            message.type === 'bought' &&
            Number(user.buyAlertAmount) < message.amount &&
            user.tracking === true
          ) {
            await this.syntraBotService.notifyUsers(message, user.chatId);
            console.log(`✅ Message sent to chatId ${user.chatId}`);
          } else if (
            message.type === 'sold' &&
            Number(user.sellAlertAmount) < message.amount &&
            user.tracking === true
          ) {
            await this.syntraBotService.notifyUsers(message, user.chatId);
            console.log(`✅ Message sent to chatId ${user.chatId}`);
          } else {
            console.log(
              `❌ Alert amount not met for chatId ${user.chatId}. Amount: ${message.amount}, Alert Amount: ${user.buyAlertAmount} or ${user.sellAlertAmount}`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to send message to chatId ${user.chatId}`,
            error,
          );
        }
      }),
    );
  }

  private attemptReconnect(): void {
    this.logger.log('Attempting to reconnect...');
    setTimeout(() => {
      this.connect();
    }, 5000);
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.logger.log('WebSocket connection closed manually.');
    }
  }

  // Method to reconfigure filters when tracked wallets change
  public async updateFilters(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      await this.configureFilters();
    }
  }

  async getUsersTrackingWallet(walletAddress: string): Promise<UserDocument[]> {
    const trackedWallet = await this.trackedWalletModel
      .findOne({ walletAddress })
      .exec();

    if (!trackedWallet || !trackedWallet.chatId?.length) {
      return []; // No one is tracking this wallet
    }

    const users = await this.userModel
      .find({ chatId: { $in: trackedWallet.chatId } })
      .exec();

    return users;
  }
}
