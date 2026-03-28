const { runCollector } = require('./collector.cjs');

const intervalMinutes = Number(process.env.NEWS_POLL_INTERVAL_MINUTES || 5);
const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

let isRunning = false;

async function tick() {
  if (isRunning) {
    console.log('Previous collection is still running. Skipping this cycle.');
    return;
  }

  isRunning = true;
  const startedAt = new Date().toLocaleString('en-GB', { hour12: false });
  console.log(`[${startedAt}] Starting live collection cycle...`);

  try {
    await runCollector();
  } catch (error) {
    console.error('Live collector failed:', error);
  } finally {
    isRunning = false;
  }
}

async function main() {
  console.log(`Live news collector is running every ${intervalMinutes} minute(s).`);
  await tick();
  setInterval(tick, intervalMs);
}

main().catch((error) => {
  console.error('Failed to start live collector:', error);
  process.exit(1);
});
