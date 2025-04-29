import { Body, Controller, Post } from '@nestjs/common';
import { SyntraAgentService } from './syntra-agent.service';

@Controller('syntra-agent')
export class SyntraAgentController {
    constructor(private readonly syntraService: SyntraAgentService) { }

    @Post()
    swapToken() {
        const privateKey = '';
        // return this.syntraService.swapToken(
        //     privateKey,
        //     payload.prompt,
        //     payload.chatId,
        // );
        return this.syntraService.getSwapQuote("So11111111111111111111111111111111111111112", "GkeUTuaFB4oZADaqiCo3yauHNx9SxUNn8euHptEEbonk", 10000)
    }
}
