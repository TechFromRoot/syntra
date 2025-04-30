import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from 'src/database/schemas/transaction.schema';
import { WalletService } from 'src/wallet/wallet.service';
import { API_URLS } from '@raydium-io/raydium-sdk-v2';
import { firstValueFrom } from 'rxjs';
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

@Injectable()
export class SyntraDexService {
  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    @InjectModel(Transaction.name)
    private readonly TransactionModel: Model<Transaction>,
  ) {}

  async botBuyToken(
    privateKey: string,
    tokenMint: string,
    amount: string,
    chatId: number,
  ) {
    try {
      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = tokenMint;
      const inputTokenDetails = await this.getTokenDetails(inputMint);
      const outputTokenDetails = await this.getTokenDetails(outputMint);

      const userAccount = Keypair.fromSecretKey(bs58.decode(privateKey));
      const userAddress = userAccount.publicKey;

      const { balance } = await this.walletService.getSolBalance(
        String(userAddress),
        process.env.SOLANA_RPC,
      );

      if (balance < parseFloat(amount)) {
        return 'Insufficient balance.';
      }

      const swapResponse = await this.getSwapQuote(
        inputMint,
        outputMint,
        Number(amount) * 10 ** inputTokenDetails.decimals,
      );

      const connection = new Connection(process.env.SOLANA_RPC, {
        commitment: 'confirmed',
      });

      await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(inputMint),
        userAddress,
      );

      const swapUrl = `${API_URLS.SWAP_HOST}/transaction/swap-base-in`;

      const { data } = await firstValueFrom(
        this.httpService.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`),
      );

      const txVersion: string = 'V0';

      const inputAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(inputMint),
        userAddress,
      );

      const outputAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(outputMint),
        userAddress,
      );

      const swapTrx = await firstValueFrom(
        this.httpService.post(swapUrl, {
          computeUnitPriceMicroLamports: String(data.data.default.h),
          swapResponse,
          txVersion,
          wallet: userAddress,
          wrapSol: true,
          unwrapSol: false,
          inputAccount: inputAccount.address.toBase58(),
          outputAccount: outputAccount.address.toBase58(),
        }),
      );

      // Decode the base64 transaction
      const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, 'base64');

      // Deserialize into a VersionedTransaction
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Set recent blockhash and fee payer
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.message.recentBlockhash = blockhash;

      // Sign the transaction
      transaction.sign([userAccount]);

      // Send the signed transaction
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm the transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        swapResponse.data.inputMint,
      );

      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: swapResponse.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: swapResponse.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: swapResponse.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: swapResponse.data.outputAmount,
        hash: signature,
      });
      await transactionDetails.save();

      return `https://explorer.solana.com/tx/${signature}?cluster=mainnet`;
    } catch (error: any) {
      console.error('Error in swapToken:', error);
      return `Error buying token: ${error.message}`;
    }
  }

  async botSellToken(
    privateKey: string,
    tokenMint: string,
    amountPercent: string,
    chatId: number,
  ) {
    try {
      const inputMint = tokenMint;
      const outputMint = 'So11111111111111111111111111111111111111112';
      const inputTokenDetails = await this.getTokenDetails(inputMint);
      const outputTokenDetails = await this.getTokenDetails(outputMint);

      const userAccount = Keypair.fromSecretKey(bs58.decode(privateKey));
      const userAddress = userAccount.publicKey;

      const { balance } = await this.walletService.getToken2022Balance(
        String(userAddress),
        inputMint,
        process.env.SOLANA_RPC,
        Number(inputTokenDetails.decimals),
        inputTokenDetails.programId,
      );

      const amount = (balance * parseFloat(amountPercent)) / 100;

      if (balance < amount) {
        return 'Insufficient balance.';
      }

      const swapResponse = await this.getSwapQuote(
        inputMint,
        outputMint,
        Number(amount) * 10 ** inputTokenDetails.decimals,
      );

      const connection = new Connection(process.env.SOLANA_RPC, {
        commitment: 'confirmed',
      });

      const swapUrl = `${API_URLS.SWAP_HOST}/transaction/swap-base-in`;

      const { data } = await firstValueFrom(
        this.httpService.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`),
      );

      const txVersion: string = 'V0';

      const inputAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(inputMint),
        userAddress,
      );

      const outputAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(outputMint),
        userAddress,
      );

      const swapTrx = await firstValueFrom(
        this.httpService.post(swapUrl, {
          computeUnitPriceMicroLamports: String(data.data.default.h),
          swapResponse,
          txVersion,
          wallet: userAddress,
          wrapSol: false,
          unwrapSol: true,
          inputAccount: inputAccount.address.toBase58(),
          outputAccount: outputAccount.address.toBase58(),
        }),
      );

      // Decode the base64 transaction
      const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, 'base64');

      // Deserialize into a VersionedTransaction
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Set recent blockhash and fee payer
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.message.recentBlockhash = blockhash;

      // Sign the transaction
      transaction.sign([userAccount]);

      // Send the signed transaction
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm the transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        swapResponse.data.inputMint,
      );

      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: swapResponse.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: swapResponse.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: swapResponse.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: swapResponse.data.outputAmount,
        hash: signature,
      });
      await transactionDetails.save();

      return `https://explorer.solana.com/tx/${signature}?cluster=mainnet`;
    } catch (error: any) {
      console.error('Error in swapToken:', error);
      return `Error selling token: ${error.message}`;
    }
  }

  async getSwapQuote(
    inputMint: string,
    outputMint: string,
    amountInDecimals: number,
  ) {
    const slippage = 0.5;
    const txVersion = 'V0';

    const swapComputeUrl = `https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInDecimals}&slippageBps=${slippage * 100}&txVersion=${txVersion}`;

    const { data: swapResponse } = await firstValueFrom(
      this.httpService.get(swapComputeUrl),
    );

    if (swapResponse.success === false) {
      throw new Error(`Swap failed: ${swapResponse.msg}`);
    }

    return swapResponse;
  }

  async getTokenDetails(address: string) {
    try {
      const url = `https://api-v3.raydium.io/mint/ids?mints=${address}`;
      const response = await firstValueFrom(this.httpService.get(url));

      return response.data.data[0];
    } catch (error: any) {
      console.error(
        `Error fetching token details for ${address}:`,
        error.message,
      );
      return error.message;
    }
  }

  fetchSupportedTokenPrice = async (address: string) => {
    try {
      const response = await this.httpService.axiosRef.get(
        `https://api-v3.raydium.io/mint/price?mints=${address}`,
      );
      const price = Object.values(response.data.data)[0];
      return price;
    } catch (error) {
      console.error(error);
    }
  };
}
