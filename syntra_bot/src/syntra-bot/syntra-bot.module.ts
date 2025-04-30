import { forwardRef, Module } from '@nestjs/common';
import { SyntraBotService } from './syntra-bot.service';
import { HttpModule } from '@nestjs/axios';
import { VybeIntegrationModule } from 'src/vybe-integration/vybe-integration.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { Session, SessionSchema } from 'src/database/schemas/session.schema';
import { Assets, AssetsSchema } from 'src/database/schemas/userAsset.schema';
import { SyntraDexModule } from 'src/syntra-dex/syntra-dex.module';
import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transaction.schema';
import {
  TrackedWallet,
  TrackedWalletSchema,
} from 'src/database/schemas/trackedWallet.schema';

@Module({
  imports: [
    HttpModule,
    VybeIntegrationModule,
    WalletModule,
    forwardRef(() => SyntraDexModule),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    MongooseModule.forFeature([{ name: Assets.name, schema: AssetsSchema }]),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: TrackedWallet.name, schema: TrackedWalletSchema },
    ]),
  ],
  exports: [SyntraBotService],
  providers: [SyntraBotService],
})
export class SyntraBotModule {}
