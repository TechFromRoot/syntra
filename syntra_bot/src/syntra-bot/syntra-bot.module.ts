import { Module } from '@nestjs/common';
import { SyntraBotService } from './syntra-bot.service';

@Module({
  providers: [SyntraBotService]
})
export class SyntraBotModule {}
