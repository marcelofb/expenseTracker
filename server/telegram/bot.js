import axios from 'axios';

function getChatIds() {
  return (process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = getChatIds();

  if (!token || chatIds.length === 0) {
    console.warn('Telegram is not configured. Skipping message delivery.');
    return;
  }

  await Promise.all(
    chatIds.map((chatId) =>
      axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    )
  );
}
