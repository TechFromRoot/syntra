import { Module } from '@nestjs/common';
import { DexService } from './dex.service';

@Module({
  providers: [DexService]
})
export class DexModule {}
