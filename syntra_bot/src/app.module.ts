import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SyntraBotModule } from './syntra-bot/syntra-bot.module';
import { DexModule } from './dex/dex.module';
import { VybeIntegrationModule } from './vybe-integration/vybe-integration.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [SyntraBotModule, DexModule, VybeIntegrationModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
