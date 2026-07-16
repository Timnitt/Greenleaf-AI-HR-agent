import 'dotenv/config';
import { testConnection } from './db/client.js';
import { initHolidays } from './agent/holidays.js';
import { cleanupOldSessions } from './agent/session.js';
import { startSlackBot } from './interface/slackBot.js';
import { startWeb } from './interface/web.js';

async function main(): Promise<void> {
  console.log('🌿 GreenLeaf HR Agent starting...\n');

  // Startup sequence — ordered, fail-fast
  await testConnection();
  await initHolidays();
  await cleanupOldSessions(
    parseInt(process.env.MAX_SESSION_AGE_HOURS ?? '24')
  );

  // Mode detection: web when forced (--web) or on a platform (PORT set),
  // Slack when tokens exist, web as the local default otherwise
  const webMode = process.argv.includes('--web') || Boolean(process.env.PORT);
  const slackConfigured = Boolean(
    process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN
  );

  if (!webMode && slackConfigured) {
    await startSlackBot();
  } else {
    await startWeb();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
