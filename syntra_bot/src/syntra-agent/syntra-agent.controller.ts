import { Body, Controller, Post } from '@nestjs/common';
import { SyntraAgentService } from './syntra-agent.service';

@Controller('syntra-agent')
export class SyntraAgentController {
    constructor(private readonly syntraService: SyntraAgentService) { }

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
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "100",
            1234
        );
        // return this.syntraService.getSwapQuote("So11111111111111111111111111111111111111112", "GkeUTuaFB4oZADaqiCo3yauHNx9SxUNn8euHptEEbonk", 10000)
    }
}
