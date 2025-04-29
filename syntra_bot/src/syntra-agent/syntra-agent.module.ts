import { Module } from '@nestjs/common';
import { SyntraAgentService } from './syntra-agent.service';
import { SyntraAgentController } from './syntra-agent.controller';
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
    WalletModule
  ],
  providers: [SyntraAgentService],
  controllers: [SyntraAgentController]
})
export class SyntraAgentModule { }
