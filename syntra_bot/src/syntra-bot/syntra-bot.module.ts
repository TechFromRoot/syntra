import { Module } from '@nestjs/common';
import { SyntraBotService } from './syntra-bot.service';
import { HttpModule } from '@nestjs/axios';
import { VybeIntegrationModule } from 'src/vybe-integration/vybe-integration.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { WalletModule } from 'src/wallet/wallet.module';
import { Session, SessionSchema } from 'src/database/schemas/session.schema';
import { Assets, AssetsSchema } from 'src/database/schemas/userAsset.schema';
import { SyntraDexModule } from 'src/syntra-dex/syntra-dex.module';

@Module({
  imports: [
    HttpModule,
    VybeIntegrationModule,
    WalletModule,
    SyntraDexModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    MongooseModule.forFeature([{ name: Assets.name, schema: AssetsSchema }]),
  ],
  providers: [SyntraBotService],
})
export class SyntraBotModule {}
