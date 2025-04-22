import { Module } from '@nestjs/common';
import { VybeIntegrationService } from './vybe-integration.service';
import { VybeWebSocketService } from './vybe-websocket';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TrackedWallet,
  TrackedWalletSchema,
} from 'src/database/schemas/trackedWallet.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: TrackedWallet.name, schema: TrackedWalletSchema },
    ]),
  ],
  providers: [VybeIntegrationService, VybeWebSocketService],
  exports: [VybeIntegrationService],
})
export class VybeIntegrationModule {}
