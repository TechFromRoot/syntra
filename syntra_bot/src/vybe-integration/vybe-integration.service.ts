import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { TokenData, TokenReport, HolderData } from './interfaceS';

@Injectable()
export class VybeIntegrationService {
  constructor(private readonly httpService: HttpService) {}

  async getTokenReport(mint: string): Promise<TokenReport | undefined> {
    const [tokenResult, holdersResult] = await Promise.allSettled([
      this.httpService.axiosRef.get(
        `https://api.vybenetwork.xyz/token/${mint}`,
        {
          headers: {
            'X-API-KEY': process.env.VYBE_API_KEY,
          },
        },
      ),
      this.httpService.axiosRef.get(
        `https://api.vybenetwork.xyz/token/${mint}/top-holders`,
        {
          headers: {
            'X-API-KEY': process.env.VYBE_API_KEY,
          },
        },
      ),
    ]);

    const tokenData =
      tokenResult.status === 'fulfilled' && !tokenResult.value.data.error
        ? tokenResult.value.data
        : null;

    const holdersData =
      holdersResult.status === 'fulfilled' && !holdersResult.value.data.error
        ? holdersResult.value.data.data.slice(0, 10)
        : null;

    if (!tokenData && !holdersData) {
      return undefined;
    }

    const tokenDetail: TokenData | null = tokenData;
    const topHolders: HolderData[] | null = holdersData;

    return { tokenDetail, topHolders };
  }
}
