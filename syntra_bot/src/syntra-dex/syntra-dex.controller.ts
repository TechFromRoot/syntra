import { Controller, Post } from '@nestjs/common';
import { SyntraDexService } from './syntra-dex.service';

@Controller('syntra-agent')
export class SyntraDexController {
  constructor(private readonly syntraService: SyntraDexService) {}

  @Post()
  swapToken() {
    const privateKey = '';
    // return this.syntraService.botBuyToken(
    //     privateKey,
    //     "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    //     "0.005",
    //     1234
    // );
    return this.syntraService.botSellToken(
      privateKey,
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      '100',
      1234,
    );
    // return this.syntraService.getSwapQuote("So11111111111111111111111111111111111111112", "GkeUTuaFB4oZADaqiCo3yauHNx9SxUNn8euHptEEbonk", 10000)
  }
}
