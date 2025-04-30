export interface TokenData {
  symbol: string;
  name: string;
  mintAddress: string;
  price: number;
  price1d: number;
  price7d: number;
  decimal: number;
  logoUrl: string;
  category: string | null;
  subcategory: string | null;
  verified: boolean;
  updateTime: number;
  currentSupply: number;
  marketCap: number;
  tokenAmountVolume24h: number;
  usdValueVolume24h: number;
}

export interface HolderData {
  rank: number;
  ownerAddress: string;
  ownerName: string | null;
  ownerLogoUrl: string | null;
  tokenMint: string;
  tokenSymbol: string;
  tokenLogoUrl: string;
  balance: string;
  valueUsd: string;
  percentageOfSupplyHeld: number;
}

export interface TokenReport {
  tokenDetail: TokenData | null;
  topHolders: HolderData[] | null;
}

export interface TrackingAlert {
  walletAddress: string;
  type: 'bought' | 'sold';
  amount: number;
  signature: string;
  mintAddress: string;
  timestamp: number;
}
