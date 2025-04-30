import { Module } from '@nestjs/common';
import { SyntraDexService } from './syntra-dex.service';
import { SyntraDexController } from './syntra-dex.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction } from '@solana/web3.js';
import { TransactionSchema } from 'src/database/schemas/transaction.schema';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    WalletModule,
  ],
  providers: [SyntraDexService],
  controllers: [SyntraDexController],
})
export class SyntraDexModule {}
