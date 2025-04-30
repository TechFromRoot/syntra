import { TokenData } from '../../vybe-integration/interfaces';
import * as dotenv from 'dotenv';
dotenv.config();

interface TokenAsset extends TokenData {
  tokenMint: string;
  amount: number;
}
// interface ManageAssetMarkup {
//   message: string;
//   keyboard: Array<Array<{ text: string; callback_data: string }>>;
// }

const formatPrice = (price: number): string => {
  if (price === 0) return '0';
  if (price < 0.00000001) return `${price.toFixed(8)}(~&lt; 0.00000001)`;
  return price.toFixed(8);
};

const formatNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

export const manageAssetMarkup = async (
  tokens: TokenAsset[],
  solBalance: number,
  page: number = 1,
  remaining?: number,
) => {
  console.log(page);
  let message = `<b>Assets Overview:</b>\n\n`;

  for (const token of tokens) {
    message += `➤ <a href="${process.env.BOT_URL}?start=position_${token.mintAddress}">/ <b>${token.name}</b></a>\nValue: ${token.amount}($${token.amount * token.price})\nMcap 📊: $${formatNumber(token.marketCap)}\nPrice: $${formatPrice(token.price)}\n\n`;
  }
  if (remaining) {
    message += `... and ${remaining} more tokens\n\n`;
  }

  message += `Balance: ${solBalance} SOL`;

  return {
    message,
    keyboard: [
      [
        {
          text: '⬅️ Prev',
          callback_data: JSON.stringify({
            command: '/prev',
            page: `${page - 1 <= 0 ? 1 : page - 1}`,
          }),
        },
        {
          text: `Page ${page}`,
          callback_data: JSON.stringify({
            command: '/neutral',
            remaining: `${remaining}`,
          }),
        },
        {
          text: 'Next ➡️',
          callback_data: JSON.stringify({
            command: '/next',
            page: `${remaining <= 0 ? 1 : +page + 1}`,
          }),
        },
      ],
      [
        {
          text: '💳 My Wallet',
          callback_data: JSON.stringify({
            command: '/walletFeatures',
            language: 'english',
          }),
        },
        {
          text: 'setting',
          callback_data: JSON.stringify({
            command: '/settings',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'home',
          callback_data: JSON.stringify({
            command: '/menu',
            language: 'english',
          }),
        },
        {
          text: 'Refresh',
          callback_data: JSON.stringify({
            command: '/refreshAsset',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Close',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
