// Modulo Telegram: due sole cose.
// 1) sendTelegramMessage: manda un testo a un chatId usando il token del bot.
// 2) handleTelegramUpdate: gestisce gli aggiornamenti in arrivo dal bot; per ora
//    risponde a /start dicendo all'utente il suo chatId da incollare nell'app.
//
// Il token NON è qui dentro: arriva da process.env.TELEGRAM_BOT_TOKEN.

const TELEGRAM_API = 'https://api.telegram.org';

function botToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN non configurato');
  return t;
}

export async function sendTelegramMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(`Telegram ha rifiutato l'invio: ${data.description || res.status}`);
  }
  return data.result;
}

// Chiamato dal webhook quando qualcuno scrive al bot.
export async function handleTelegramUpdate(update) {
  const msg = update?.message;
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (text.startsWith('/start')) {
    const nome = msg.from?.first_name ? `, ${msg.from.first_name}` : '';
    await sendTelegramMessage(
      chatId,
      `Ciao${nome}! 👋\n\n` +
        `Il tuo codice è: ${chatId}\n\n` +
        `Incollalo nell'app (Impostazioni → Collega Telegram) per ricevere qui le liste della spesa.`
    );
    return;
  }

  // Qualsiasi altro messaggio: piccola guida.
  await sendTelegramMessage(
    chatId,
    'Per collegarti, scrivi /start e copia il codice che ti do nell\'app.'
  );
}
