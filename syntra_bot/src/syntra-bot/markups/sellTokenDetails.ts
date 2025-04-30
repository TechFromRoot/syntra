import * as dotenv from 'dotenv';
import { TokenData } from 'src/vybe-integration/interfaces';
dotenv.config();

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B'; // Billion
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'; // Million
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'; // Thousand
  } else {
    return num.toFixed(4); // Return the number as is if it's less than 1,000
  }
};

const formatPrice = (price: number): string => {
  if (price === 0) return '0';
  if (price < 0.00000001) return `${price.toFixed(8)}(~&lt; 0.00000001)`;
  return price.toFixed(8);
};

export const sellTokenMarkup = async (
  token: TokenData,
  balance: any,
  solBalance: any,
) => {
  console.log(token);
  return {
    message: `${token.symbol} | ${token.name}\n<code>${token.mintAddress}</code>\n <a href="https://vybe.fyi/tokens/${token.mintAddress}">Chart</a> | <a href="https://widget.vybenetwork.com/network-graph?address=${token.mintAddress}&entity=token&connectionNode=program">Vybe-network-graph</a> | <a href="${process.env.SOLSCAN_SCAN_URL}address/${token.mintAddress}">Explorer</a> \n\nValue: ${balance}($${balance * token.price})\nMcap 📊: $${formatNumber(token.marketCap)}\nPrice: $${formatPrice(token.price)}\n\n\nSOL balance: ${formatNumber(parseFloat(solBalance))} SOL`,
    keyboard: [
      [
        {
          text: 'Home',
          callback_data: JSON.stringify({
            command: '/menu',
            language: 'english',
          }),
        },
        {
          text: '✅ Swap',
          callback_data: JSON.stringify({
            command: '/neutral',
            language: 'english',
          }),
        },
        {
          text: 'Close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '🔴 Sell 25%',
          callback_data: JSON.stringify({
            s: `/S|${token.mintAddress}`,
            a: 25,
          }),
        },
        {
          text: '🔴 Sell 100%',
          callback_data: JSON.stringify({
            s: `/S|${token.mintAddress}`,
            a: 100,
          }),
        },
        {
          text: '🔴 Sell X %',
          callback_data: JSON.stringify({
            s: `/S|${token.mintAddress}`,
            a: 0,
          }),
        },
      ],
      [
        {
          text: '🟢Buy 1.0 SOL',
          callback_data: JSON.stringify({
            c: `/B|${token.mintAddress}`,
            a: 1.0,
          }),
        },
        {
          text: '🟢Buy 5 SOL',
          callback_data: JSON.stringify({
            c: `/B|${token.mintAddress}`,
            a: 5,
          }),
        },
        {
          text: '🟢Buy X SOL',
          callback_data: JSON.stringify({
            c: `/B|${token.mintAddress}`,
            a: 0,
          }),
        },
      ],
      [
        {
          text: 'setting',
          callback_data: JSON.stringify({
            command: '/settings',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
