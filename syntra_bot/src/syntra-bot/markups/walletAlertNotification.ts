import { TrackingAlert } from '../../vybe-integration/interfaces';
import * as dotenv from 'dotenv';
dotenv.config();

const formatBlockTime = (blockTime: number): string => {
  const date = new Date(blockTime * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm} UTC`;
};

export const walletAlertNotificationMarkup = async (
  tokenAlert: TrackingAlert,
) => {
  const lines: string[] = [];

  lines.push(`🔔 <b>Transaction Alert</b>`);
  lines.push(`└ Wallet <code>${tokenAlert.walletAddress}</code>`);
  lines.push(
    `  > ${tokenAlert.type} ${tokenAlert.amount} ${tokenAlert.mintAddress}`,
  );
  lines.push(`  > at ${formatBlockTime(tokenAlert.timestamp)}`);
  lines.push(`\n\nCA: <code>${tokenAlert.mintAddress}</code>`);

  const fullMessage = lines.join('\n');
  const message =
    fullMessage.length > 4096
      ? fullMessage.substring(0, 4093) + '...'
      : fullMessage;

  const keyboard = [
    [
      {
        text: '🤖 Trade Token',
        url: `${process.env.BOT_URL}?start=ca-${tokenAlert.mintAddress}`,
      },
    ],
    [
      {
        text: '🗑️ Delete',
        callback_data: JSON.stringify({
          c: `/close`,
        }),
      },
    ],
  ];

  return {
    message,
    keyboard,
  };
};
