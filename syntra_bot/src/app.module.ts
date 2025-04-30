import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SyntraBotModule } from './syntra-bot/syntra-bot.module';
import { VybeIntegrationModule } from './vybe-integration/vybe-integration.module';
import { DatabaseModule } from './database/database.module';
import { WalletModule } from './wallet/wallet.module';
import { SyntraDexModule } from './syntra-dex/syntra-dex.module';

@Module({
  imports: [
    SyntraBotModule,
    VybeIntegrationModule,
    DatabaseModule,
    WalletModule,
    SyntraDexModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
