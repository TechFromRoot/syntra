import { Module } from '@nestjs/common';
import { SyntraBotService } from './syntra-bot.service';
import { HttpModule } from '@nestjs/axios';
import { VybeIntegrationModule } from 'src/vybe-integration/vybe-integration.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    HttpModule,
    VybeIntegrationModule,
    WalletModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [SyntraBotService],
})
export class SyntraBotModule {}
