import { UserDocument } from 'src/database/schemas/user.schema';

export const walletFeaturesMarkup = async (
  user: UserDocument,
  balance: number,
) => {
  return {
    message: `<b>Your wallet :</b>\n\n<code>${user.solWalletAddress}</code>\nbalance: ${balance} SOL\n\nChoose an action below to manage your wallet 👇`,
    keyboard: [
      [
        {
          text: 'Fund wallet 💵',
          callback_data: JSON.stringify({
            command: '/fundWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Export wallet',
          callback_data: JSON.stringify({
            command: '/exportWallet',
            language: 'english',
          }),
        },
        {
          text: 'Reset wallet',
          callback_data: JSON.stringify({
            command: '/resetWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
