export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hey @${userName} 👋\n\nWelcome to <b>Syntra</b> — your all-in-one wallet alert tracker and copy trading bot!\n\n🔍 Track wallets and get real-time alerts when they buy or sell tokens.\n🤖 Enable auto-trading to copy their every move — buy what they buy, sell when they sell.\n\nStart by typing pasting a token address to get onchain analysis or /track &lt;wallet address&gt; to track a wallet address. Let’s trade smarter 🚀\n\n<b>Powered by <a href="https://vybe.fyi/?tab=trending-tokens">Vybe API</a> ⚡️</b>`,
    keyboard: [
      [
        {
          text: '➕ Add to Group',
          url: `${process.env.BOT_URL}?startgroup=true`,
        },
        // {
        //   text: 'commands',
        //   callback_data: JSON.stringify({
        //     c: `/commands`,
        //   }),
        // },
      ],
    ],
  };
};
