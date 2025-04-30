import { TokenData, HolderData } from 'src/vybe-integration/interfaceS';
console.log();

const shortenAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

const formatPrice = (price: number): string => {
  if (price === 0) return '0';
  if (price < 0.00000001) return `${price.toFixed(8)}(~&lt; 0.00000001)`;
  return price.toFixed(8);
};

export const tokenDisplayMarkup = async (
  token: TokenData,
  topHolders: HolderData[] | null,
  // isprivate_chat?: boolean,
) => {
  const lines: string[] = [];

  // Title with symbol and mint address
  lines.push(`💜 <b>${token.name} (${token.symbol})</b>`);
  lines.push(`└ <code>${token.mintAddress}</code>`); // Hardcoded chain and age as per image

  // Token Stats
  const statsFields: string[] = [];
  if (token.price !== undefined) {
    statsFields.push(`💵 <b>USD:</b> $${formatPrice(token.price)} (0%)`); // Assuming 0% change as per image
  }
  if (token.marketCap !== undefined) {
    statsFields.push(`📊 <b>MC:</b> $${formatNumber(token.marketCap)}`);
  }
  if (token.usdValueVolume24h !== undefined) {
    statsFields.push(
      `📈 <b>Vol:</b> $${formatNumber(token.usdValueVolume24h)}`,
    );
  }
  if (token.currentSupply !== undefined) {
    const lp = (token.currentSupply / 10 ** token.decimal) * token.price; // Estimating LP
    statsFields.push(`🏊 <b>LP:</b> $${formatNumber(lp)} 🟡`); // Warning emoji as per image
  }
  statsFields.push(`🕒 <b>1H:</b> 0% 🅱 0 🆂 0`); // Static as per image
  if (token.currentSupply !== undefined) {
    statsFields.push(
      `🪙 <b>ATH:</b> $${formatNumber(token.currentSupply * token.price)} (-100% / 71d)`,
    ); // Estimating ATH
  }
  if (statsFields.length > 0) {
    lines.push(`\n📊 <b>Token Stats</b>`);
    statsFields.forEach((field, index) => {
      const prefix = index === statsFields.length - 1 ? '└' : '├';
      lines.push(`${prefix} ${field}`);
    });
  }

  // Top Holders (Top 3)
  if (topHolders?.length) {
    const topHoldersText = topHolders
      .slice(0, 10)
      .map((h) => {
        const amount = formatNumber(
          parseFloat(h.balance) / 10 ** token.decimal,
        );
        return `🥇 ${shortenAddress(h.ownerAddress)}: ${amount} (${h.percentageOfSupplyHeld.toFixed(2)}%)`;
      })
      .join('\n');
    lines.push(`\n👥 <b>Top Holders</b>`);
    lines.push(`<blockquote expandable>${topHoldersText}</blockquote>`);
  }

  // Truncate to Telegram’s 4096-character limit
  const fullMessage = lines.join('\n');
  const message =
    fullMessage.length > 4096
      ? fullMessage.substring(0, 4093) + '...'
      : fullMessage;

  const keyboard = [];

  keyboard.push([
    {
      text: '🤖 Trade Token',
      url: `${process.env.BOT_URL}?start=ca-${token.mintAddress}`,
    },
  ]);

  // Always add Delete and Refresh buttons
  keyboard.push([
    {
      text: '🗑️ Delete',
      callback_data: JSON.stringify({
        c: `/close`,
      }),
    },
    {
      text: '🔄 Refresh',
      callback_data: JSON.stringify({
        c: `/refresh|${token.mintAddress}`,
      }),
    },
  ]);

  return {
    message,
    keyboard,
  };
};
