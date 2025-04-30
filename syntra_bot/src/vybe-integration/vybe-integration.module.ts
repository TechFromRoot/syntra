import { forwardRef, Module } from '@nestjs/common';
import { VybeIntegrationService } from './vybe-integration.service';
import { VybeWebSocketService } from './vybe-websocket';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TrackedWallet,
  TrackedWalletSchema,
} from 'src/database/schemas/trackedWallet.schema';
import { HttpModule } from '@nestjs/axios';
import { SyntraBotModule } from 'src/syntra-bot/syntra-bot.module';
import { User, UserSchema } from 'src/database/schemas/user.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: TrackedWallet.name, schema: TrackedWalletSchema },
    ]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => SyntraBotModule),
  ],
  providers: [VybeIntegrationService, VybeWebSocketService],
  exports: [VybeIntegrationService, VybeWebSocketService],
})
export class VybeIntegrationModule {}
