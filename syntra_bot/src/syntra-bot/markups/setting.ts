export const settingsMarkup = async (
  buySlippage: string,
  sellSlippage: string,
  buyAlertAmount: string,
  sellAlertAmount: string,
  tracking: boolean,
) => {
  return {
    message: `<b>Settings</b>:\n\n<b>SLIPPAGE CONFIG</b>\nCustomize your slippage settings for buys and sells. Tap to edit.\n\n<b>WALLET TRACKING CONFIG</b>\nSet your wallet tracking amounts  for buys and sells. Tap to edit.`,
    keyboard: [
      [
        {
          text: '--- SLIPPAGE CONFIG ---',
          callback_data: JSON.stringify({
            command: '/neutral',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: `✎ Buy: ${buySlippage}%`,
          callback_data: JSON.stringify({
            command: '/buySlippage',
            language: 'english',
          }),
        },
        {
          text: `✎ Sell: ${sellSlippage}%`,
          callback_data: JSON.stringify({
            command: '/sellSlippage',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '--- WALLET TRACKING CONFIG ---',
          callback_data: JSON.stringify({
            command: '/neutral',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: `✎ Wallet Buy Alert Unit : ${buyAlertAmount}`,
          callback_data: JSON.stringify({
            command: '/buyAlertAmount',
            language: 'english',
          }),
        },
        {
          text: `✎ Wallet Sell Alert Unit: ${sellAlertAmount}`,
          callback_data: JSON.stringify({
            command: '/sellAlertAmount',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: `Wallet Tracking :  ${tracking ? ' ON' : 'OFF'}`,
          callback_data: JSON.stringify({
            command: '/OnOffWalletTracking',
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
