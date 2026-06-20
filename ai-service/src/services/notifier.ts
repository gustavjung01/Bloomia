import { config } from '../config.js';

export async function sendNotify(text: string) {
  if (!config.tg.key || !config.tg.chat) {
    return { sent: false, reason: 'notify_not_configured' };
  }

  const url = `https://api.telegram.org/bot${config.tg.key}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: config.tg.chat, text }),
  });

  return { sent: response.ok, status: response.status };
}
