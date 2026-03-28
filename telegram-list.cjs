const fs = require('fs');
const path = require('path');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
require('dotenv').config();

const projectRoot = __dirname;
const sessionPath = path.resolve(projectRoot, process.env.TELEGRAM_SESSION_PATH || './telegram.session');
const apiId = Number(process.env.TELEGRAM_API_ID || 0);
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
  throw new Error('Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env');
}

if (!fs.existsSync(sessionPath)) {
  throw new Error(`Missing Telegram session file: ${sessionPath}`);
}

async function main() {
  const stringSession = fs.readFileSync(sessionPath, 'utf8');
  const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  const dialogs = await client.getDialogs({ limit: 200 });

  console.log('Telegram chats visible to your account:');
  for (const dialog of dialogs) {
    const entity = dialog.entity || {};
    const title = entity.title || entity.firstName || 'Unknown';
    const username = entity.username ? `@${entity.username}` : '(no username)';
    const id = entity.id ? String(entity.id) : '(no id)';
    console.log(`${title} | ${username} | ${id}`);
  }
}

main().catch((error) => {
  console.error('telegram:list failed:', error);
  process.exit(1);
});
