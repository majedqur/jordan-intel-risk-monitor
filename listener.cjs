const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const projectRoot = __dirname;
const sessionPath = path.resolve(projectRoot, process.env.TELEGRAM_SESSION_PATH || './telegram.session');
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(projectRoot, process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(projectRoot, 'gen-lang-client-0217314209-firebase-adminsdk-fbsvc-1335e2b475.json');

const apiId = Number(process.env.TELEGRAM_API_ID || 0);
const apiHash = process.env.TELEGRAM_API_HASH || '';
const channels = (process.env.TELEGRAM_CHANNELS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!apiId || !apiHash) {
  throw new Error('Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env');
}

if (channels.length === 0) {
  throw new Error('Missing TELEGRAM_CHANNELS in .env');
}

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Missing Firebase service account file at: ${serviceAccountPath}`);
}

if (!admin.apps.length) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const databaseId =
  process.env.FIREBASE_DATABASE_ID ||
  process.env.VITE_FIREBASE_DATABASE_ID ||
  undefined;

const db = databaseId ? getFirestore(undefined, databaseId) : getFirestore();

function normalizeChannelInput(value) {
  return value
    .trim()
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .split('?')[0]
    .trim();
}

const normalizedChannels = channels.map(normalizeChannelInput).filter(Boolean);

function getSentiment(text) {
  const negativeTerms = ['هجوم', 'قصف', 'تصعيد', 'اشتباك', 'توتر', 'تهديد', 'تحذير', 'حرب'];
  const positiveTerms = ['هدنة', 'اتفاق', 'مفاوضات', 'انفراج', 'تهدئة'];

  if (negativeTerms.some((term) => text.includes(term))) return 'negative';
  if (positiveTerms.some((term) => text.includes(term))) return 'positive';
  return 'neutral';
}

function getImpact(text) {
  const highImpactTerms = ['الأردن', 'إسرائيل', 'إيران', 'غزة', 'سوريا', 'لبنان', 'الحدود', 'الجيش'];
  const matches = highImpactTerms.filter((term) => text.includes(term)).length;
  return Math.min(10, Math.max(3, matches * 2 + 2));
}

function normalizeMessage(channelName, message) {
  const text = (message.message || '').trim();
  if (!text) return null;

  const headline = text.split('\n')[0].slice(0, 140) || 'خبر من تيليجرام';
  const summary = text.slice(0, 600);
  const timestamp = message.date ? new Date(message.date).toISOString() : new Date().toISOString();
  const id = crypto
    .createHash('sha1')
    .update(`${channelName}|${message.id}|${timestamp}|${headline}`)
    .digest('hex')
    .slice(0, 20);

  return {
    id,
    source: `Telegram: ${channelName}`,
    headline,
    summary,
    sentiment: getSentiment(text),
    impact: getImpact(text),
    credibility: 75,
    timestamp,
    url: '',
    telegramChannel: channelName,
    telegramMessageId: message.id,
    collectedAt: new Date().toISOString(),
  };
}

async function ensureSession(client) {
  if (fs.existsSync(sessionPath)) {
    return;
  }

  console.log('First Telegram login. Follow the prompts once only.');
  await client.start({
    phoneNumber: async () => input.text('Phone number: '),
    password: async () => input.text('Telegram 2FA password (if any): '),
    phoneCode: async () => input.text('Code from Telegram: '),
    onError: (error) => console.error(error),
  });

  fs.writeFileSync(sessionPath, client.session.save(), 'utf8');
  console.log(`Session saved to ${sessionPath}`);
}

async function connectClient() {
  const stringSession = fs.existsSync(sessionPath)
    ? fs.readFileSync(sessionPath, 'utf8')
    : '';

  const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  if (!stringSession) {
    await ensureSession(client);
  } else if (!client.connected) {
    await client.connect();
  }

  return client;
}

async function saveSignal(signal) {
  const ref = db.collection('signals').doc(signal.id);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(signal);
    return true;
  }
  return false;
}

async function backfillRecentMessages(client) {
  let saved = 0;

  for (const channel of normalizedChannels) {
    try {
      const messages = await client.getMessages(channel, { limit: 20 });
      for (const message of messages) {
        const signal = normalizeMessage(channel, message);
        if (!signal) continue;
        if (await saveSignal(signal)) saved += 1;
      }
      console.log(`Backfilled ${channel}`);
    } catch (error) {
      console.error(`Failed to read ${channel}:`, error.message || error);
    }
  }

  console.log(`Saved ${saved} Telegram signals.`);
}

async function main() {
  const client = await connectClient();
  await backfillRecentMessages(client);

  client.addEventHandler(async (update) => {
    const message = update.message;
    if (!message || !message.message) return;

    const peer = await message.getChat();
    const channelName = peer?.username || peer?.title || 'telegram';
    const normalizedChannelName = normalizeChannelInput(channelName);
    if (!normalizedChannels.includes(normalizedChannelName)) return;

    const signal = normalizeMessage(normalizedChannelName, message);
    if (!signal) return;

    const saved = await saveSignal(signal);
    if (saved) {
      console.log(`New Telegram signal saved from ${channelName}: ${signal.headline}`);
    }
  });

  console.log('Telegram listener is running...');
  console.log(`Watching channels: ${normalizedChannels.map((channel) => `@${channel}`).join(', ')}`);
}

main().catch((error) => {
  console.error('Telegram listener failed:', error);
  process.exit(1);
});
