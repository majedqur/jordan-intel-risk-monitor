const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Parser = require('rss-parser');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'jordan-intel-risk-monitor/1.0',
  },
});

const projectRoot = __dirname;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(projectRoot, process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(projectRoot, 'gen-lang-client-0217314209-firebase-adminsdk-fbsvc-1335e2b475.json');

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

const DEFAULT_FEEDS = [
  'https://news.google.com/rss/search?q=%D8%A7%D9%84%D8%A3%D8%B1%D8%AF%D9%86+%D8%A7%D9%84%D8%B4%D8%B1%D9%82+%D8%A7%D9%84%D8%A3%D9%88%D8%B3%D8%B7&hl=ar&gl=JO&ceid=JO:ar',
  'https://news.google.com/rss/search?q=Jordan+Middle+East&hl=en&gl=US&ceid=US:en',
];

const feedUrls = (process.env.NEWS_FEEDS || DEFAULT_FEEDS.join(','))
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const translationCache = new Map();

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text || '');
}

async function translateToArabic(text) {
  const input = (text || '').trim();
  if (!input || hasArabic(input)) {
    return input;
  }

  if (translationCache.has(input)) {
    return translationCache.get(input);
  }

  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = new URLSearchParams({
      client: 'gtx',
      sl: 'auto',
      tl: 'ar',
      dt: 't',
      q: input,
    }).toString();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'jordan-intel-risk-monitor/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation failed with status ${response.status}`);
    }

    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part) => part?.[0] || '').join('').trim()
      : input;

    const result = translated || input;
    translationCache.set(input, result);
    return result;
  } catch (error) {
    console.warn('Translation skipped:', error?.message || error);
    return input;
  }
}

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

function isRelevantSignal(signal) {
  const text = `${signal.headline} ${signal.summary}`.toLowerCase();

  const regionTerms = [
    'الأردن', 'jordan',
    'إسرائيل', 'israel',
    'إيران', 'iran',
    'غزة', 'gaza',
    'سوريا', 'syria',
    'لبنان', 'lebanon'
  ];

  const riskTerms = [
    'الحدود', 'border',
    'الجيش', 'army',
    'هجوم', 'attack',
    'قصف', 'strike',
    'تصعيد', 'escalation',
    'توتر', 'tension',
    'تهديد', 'threat',
    'هدنة', 'ceasefire',
    'مفاوضات', 'talks',
    'اعتراض', 'intercept',
    'صاروخ', 'missile',
    'مسيرة', 'drone',
    'أمني', 'security',
    'دفاع', 'defense',
    'احتلال', 'occupation',
    'اشتباك', 'clash',
    'إنذار', 'warning'
  ];

  const blockedTerms = [
    'المناخ', 'climate',
    'الصندوق الأخضر', 'green climate',
    'الغذاء', 'food',
    'الدواء', 'medicine',
    'الاقتصاد', 'economy',
    'بورصة', 'stock',
    'الأسعار', 'prices',
    'شركة', 'company',
    'سياحة', 'tourism',
    'رياضة', 'sport',
    'فنان', 'artist',
    'ترفيه', 'entertainment',
    'منوعات', 'lifestyle',
    'ثقافة', 'culture',
    'تكنولوجيا', 'technology'
  ];

  if (blockedTerms.some((term) => text.includes(term))) {
    return false;
  }

  const hasRegion = regionTerms.some((term) => text.includes(term));
  const hasRisk = riskTerms.some((term) => text.includes(term));

  if (hasRegion && hasRisk) {
    return true;
  }

  return (signal.impact >= 8 || signal.sentiment === 'negative') && hasRisk;
}

async function normalizeItem(feedTitle, item) {
  const rawHeadline = (item.title || 'خبر جديد').trim();
  const rawSummary = (item.contentSnippet || item.content || item.summary || rawHeadline).trim();
  const headline = await translateToArabic(rawHeadline);
  const summary = await translateToArabic(rawSummary);
  const rawTimestamp = item.isoDate || item.pubDate || new Date().toISOString();
  const timestamp = new Date(rawTimestamp).toISOString();
  const source = (feedTitle || item.creator || 'RSS').trim();
  const id = crypto
    .createHash('sha1')
    .update(`${source}|${headline}|${timestamp}`)
    .digest('hex')
    .slice(0, 20);
  const fullText = `${headline} ${summary}`;

  return {
    id,
    source,
    headline,
    summary,
    sentiment: getSentiment(fullText),
    impact: getImpact(fullText),
    credibility: 80,
    timestamp,
    url: item.link || '',
    collectedAt: new Date().toISOString(),
  };
}

async function collectFeed(url) {
  const feed = await parser.parseURL(url);
  return Promise.all(
    (feed.items || []).slice(0, 10).map((item) => normalizeItem(feed.title, item))
  );
}

async function saveSignals(signals) {
  let saved = 0;

  for (const signal of signals) {
    const ref = db.collection('signals').doc(signal.id);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set(signal);
      saved += 1;
    }
  }

  return saved;
}

async function runCollector() {
  const startedAt = new Date().toISOString();
  console.log(`Collecting news from ${feedUrls.length} feeds...`);

  const settled = await Promise.allSettled(feedUrls.map((url) => collectFeed(url)));
  const allSignals = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      allSignals.push(...result.value);
    } else {
      console.error('Feed failed:', result.reason?.message || result.reason);
    }
  }

  const uniqueSignals = Array.from(
    new Map(allSignals.map((signal) => [signal.id, signal])).values()
  )
    .filter(isRelevantSignal)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const saved = await saveSignals(uniqueSignals);
  await db.collection('system').doc('collector').set({
    lastRunAt: new Date().toISOString(),
    startedAt,
    feedsCount: feedUrls.length,
    collectedCount: uniqueSignals.length,
    savedCount: saved,
    status: 'success',
  }, { merge: true });
  console.log(`Collected ${uniqueSignals.length} items, saved ${saved} new signals.`);
}

if (require.main === module) {
  runCollector().catch((error) => {
    db.collection('system').doc('collector').set({
      lastRunAt: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    }, { merge: true }).catch(() => {});
    console.error('Collector failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runCollector,
};
