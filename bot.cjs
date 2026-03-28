const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN');
}

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
console.log("وصلت رسالة:", msg.text);

bot.sendMessage(msg.chat.id, "🔥 شغال 100%");
});

console.log("Bot is running...");
