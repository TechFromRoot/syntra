export const menuMarkup = async () => {
  return {
    message: `select any action below: 👇 `,

    keyboard: [
      [
        {
          text: '💳 My Wallet',
          callback_data: JSON.stringify({
            command: '/walletFeatures',
            language: 'english',
          }),
        },
        {
          text: '💰 Assets',
          callback_data: JSON.stringify({
            command: '/manageAsset',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '🔎 Track a wallet',
          callback_data: JSON.stringify({
            command: '/trackWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '👀 View Wallets You’re Tracking',
          callback_data: JSON.stringify({
            command: '/trackWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Analyse a token',
          callback_data: JSON.stringify({
            command: '/analyse',
            language: 'english',
          }),
        },
        {
          text: 'Buy a token',
          callback_data: JSON.stringify({
            command: '/buyToken',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '📜 Transaction History',
          callback_data: JSON.stringify({
            command: '/transactionHistory',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '⚙️ Settings',
          callback_data: JSON.stringify({
            command: '/settings',
            language: 'english',
          }),
        },
        {
          text: '📢 Share',
          language: 'english',
          switch_inline_query:
            'Syntra, your all-in-one wallet alert tracker and copy trading bot!',
        },
      ],
      [
        {
          text: '❓ Help & Support',
          url: `https://t.me/+UjRn5s2GGYFkOTM0`,
        },
      ],
    ],
  };
};
