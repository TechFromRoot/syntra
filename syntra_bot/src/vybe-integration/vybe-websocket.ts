import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrackedWallet } from 'src/database/schemas/trackedWallet.schema';
import { WebSocket } from 'ws';
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
    // const walletAddresses = await this.getTrackedWallets();

    // if (!walletAddresses.length) {
    //   this.logger.warn('No wallets to track.');
    //   return;
    // }
    const walletAddresses = [
      '8MqRTAQnjhDYH7TWS1b1DjFog4CLZfySWE5cZeotG2VW',
      '7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU',
      'JD6rVaerbyz6wjQ433nrw6bFTgFrp46MiYmi8EtUAfsG',
      'Cy4YveF3TX6WZBVWbCDPHE4vLa1a9ZLngZqykrVEsBku',
    ];
    const configureMessage = JSON.stringify({
      type: 'configure',
      filters: {
        trades: walletAddresses.map((walletAddress) => ({
          feePayer: walletAddress,
        })),
        // trades: [
        //   {
        //     authorityAddress: '8MqRTAQnjhDYH7TWS1b1DjFog4CLZfySWE5cZeotG2VW',
        //   },
        //   { feePayer: '8MqRTAQnjhDYH7TWS1b1DjFog4CLZfySWE5cZeotG2VW' },
        // ],
        // transfers: [
        //   {
        //     // tokenMintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        //     feePayer: '7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU',

        //     // authorityAddress: '8MqRTAQnjhDYH7TWS1b1DjFog4CLZfySWE5cZeotG2VW',
        //     // feePayer: '8MqRTAQnjhDYH7TWS1b1DjFog4CLZfySWE5cZeotG2VW',
        //   },
        // ],
        // trades: [
        //   { feePayer: 'JD6rVaerbyz6wjQ433nrw6bFTgFrp46MiYmi8EtUAfsG' },
        //   {
        //     feePayer: '7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU',
        //   },
        // ],
        // trades: [
        //   {
        //     // tokenMintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        //     // programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        //     authorityAddress: '7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU',
        //     feePayer: '7of9rX4qvtMQFYKi3x64PPzC3EqY1759bJENHzSp4BMU',
        //   },
        // ],
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
        await this.processMessage(parsedMessage);
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

  private async processMessage(parsedMessage: any): Promise<void> {
    const { senderAddress, receiverAddress, amount, decimal, signature } =
      parsedMessage;
    const amountInTokens = amount / 10 ** decimal;

    // Check if the sender or receiver is a tracked wallet
    const trackedWallets = await this.getTrackedWallets();
    const isSenderTracked = trackedWallets.includes(senderAddress);
    const isReceiverTracked = trackedWallets.includes(receiverAddress);

    if (isSenderTracked) {
      // Sell: Tracked wallet is the sender
      const notificationMessage = `${senderAddress} sold ${amountInTokens} tokens (signature: ${signature})`;
      await this.notifyUsers(senderAddress, notificationMessage);
    }

    if (isReceiverTracked) {
      // Buy: Tracked wallet is the receiver
      const notificationMessage = `${receiverAddress} bought ${amountInTokens} tokens (signature: ${signature})`;
      await this.notifyUsers(receiverAddress, notificationMessage);
    }
  }

  private async notifyUsers(
    walletAddress: string,
    message: string,
  ): Promise<void> {
    // Find users tracking this wallet
    const trackedWallets = await this.trackedWalletModel.find({
      where: { walletAddress },
    });
    const userIds = trackedWallets.map((tw) => tw.chatId);

    // Placeholder for notification logic
    this.logger.log(`Notifying users ${userIds.join(', ')}: ${message}`);
    // Implement your notification logic here, e.g., Firebase Cloud Messaging, email, etc.
    // Example: await this.notificationService.sendPushNotification(userIds, message);
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
}
