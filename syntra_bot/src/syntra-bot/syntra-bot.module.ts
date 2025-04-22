import { Module } from '@nestjs/common';
import { SyntraBotService } from './syntra-bot.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [SyntraBotService],
})
export class SyntraBotModule {}
