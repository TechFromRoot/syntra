// import { TokenData, HolderData } from 'src/vybe-integration/interfaceS';

// const shortenAddress = (address: string): string => {
//   if (!address || address.length < 10) return address;
//   return `${address.slice(0, 6)}...${address.slice(-4)}`;
// };

// const formatNumber = (num: number): string => {
//   if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
//   if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
//   if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
//   return num.toFixed(2);
// };

// const formatPrice = (price: number): string => {
//   if (price === 0) return '0';
//   if (price < 0.00000001) return `${price.toFixed(8)}(~< 0.00000001)`;
//   return price.toFixed(8);
// };

// export const tokenDisplayMarkup = async (
//   token: TokenData,
//   topHolders: HolderData[] | null,
// ) => {
//   const lines: string[] = [];

//   lines.push(`🔵 *${token.name} (${token.symbol})*`);
//   lines.push(`├ <code>${token.mintAddress}</code>`);

//   // Token Stats
//   const statsFields: string[] = [];
//   if (token.price !== undefined) {
//     statsFields.push(`├ *USD:* $${formatPrice(token.price)} (0%)`); // Assuming 0% change as per image
//   }
//   if (token.marketCap !== undefined) {
//     statsFields.push(`├ *MC:* $${formatNumber(token.marketCap)}`);
//   }
//   if (token.usdValueVolume24h !== undefined) {
//     statsFields.push(`└ *Vol:* $${formatNumber(token.usdValueVolume24h)}`);
//   }

//   if (statsFields.length > 0) {
//     lines.push(`\n📊 *Token Stats*`);
//     lines.push(statsFields.join('\n'));
//   }

//   // Top Holders (Top 3)
//   if (topHolders?.length) {
//     const topHoldersText = topHolders
//       .slice(0, 3)
//       .map((h) => {
//         const amount = formatNumber(
//           parseFloat(h.balance) / 10 ** token.decimal,
//         );
//         return `🥇 ${shortenAddress(h.ownerAddress)}: ${amount} (${h.percentageOfSupplyHeld.toFixed(2)}%)`;
//       })
//       .join('\n');
//     const topHoldersFields: string[] = [];
//     lines.push(`\n👥 *Top Holders*`);
//     topHoldersFields.push(
//       `<blockquote expandable>${topHoldersText}</blockquote>`,
//     );
//     lines.push(topHoldersFields.join(`\n`));
//   }

//   // Truncate to Telegram’s 4096-character limit
//   const fullMessage = lines.join('\n');
//   const message =
//     fullMessage.length > 4096
//       ? fullMessage.substring(0, 4093) + '...'
//       : fullMessage;

//   // Inline Keyboard Buttons
//   const keyboard = [
//     // Dropdown for Top 10 Holders
//     topHolders?.length
//       ? [
//           {
//             text: '👥 View Top 10 Holders',
//             callback_data: JSON.stringify({
//               c: `/top10holders|${token.mintAddress}`,
//             }),
//           },
//         ]
//       : [],
//     // Action Buttons
//     [
//       {
//         text: '📈 Track Token',
//         url: `${process.env.BOT_URL}?start=track-${token.mintAddress}`,
//       },
//       {
//         text: '🤖 Trade Token',
//         url: `https://t.me/fluxbeam_bot?start=ca-${token.mintAddress}`,
//       },
//     ],
//     [
//       {
//         text: '🗑️ Delete',
//         callback_data: JSON.stringify({
//           c: `/delete|${token.mintAddress}`,
//         }),
//       },
//       {
//         text: '🔄 Refresh',
//         callback_data: JSON.stringify({
//           c: `/refresh|${token.mintAddress}`,
//         }),
//       },
//     ],
//   ];

//   return {
//     message,
//     keyboard,
//   };
// };

// // Function to handle the Top 10 Holders dropdown callback
// export const topHoldersMarkup = (
//   topHolders: HolderData[],
//   token: TokenData,
// ) => {
//   const lines: string[] = [];

//   // Title
//   lines.push(`👥 *Top 10 Holders for ${token.name} (${token.symbol})*`);

//   // List Top 10 Holders
//   const holdersText = topHolders
//     .slice(0, 10)
//     .map((h) => {
//       const amount = formatNumber(parseFloat(h.balance) / 10 ** token.decimal);
//       return `🥇 ${shortenAddress(h.ownerAddress)}: ${amount} (${h.percentageOfSupplyHeld.toFixed(2)}%)`;
//     })
//     .join('\n');
//   lines.push(holdersText);

//   const fullMessage = lines.join('\n');
//   const message =
//     fullMessage.length > 4096
//       ? fullMessage.substring(0, 4093) + '...'
//       : fullMessage;

//   return {
//     message,
//     keyboard: [
//       [
//         {
//           text: '⬅️ Back to Token Details',
//           callback_data: JSON.stringify({
//             c: `/token|${token.mintAddress}`,
//           }),
//         },
//       ],
//     ],
//   };
// };
