// @slack/bolt is CommonJS — named ESM imports fail, so import default and destructure
import bolt from '@slack/bolt';
import { handleMessage } from '../agent/orchestrator.js';

const { App } = bolt;

export async function startSlackBot(): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;
  if (!token || !appToken) {
    throw new Error('SLACK_BOT_TOKEN and SLACK_APP_TOKEN must be set to start Slack mode');
  }

  const app = new App({
    token,
    appToken,
    socketMode: true
  });

  // Direct messages to the bot
  app.message(async ({ message, say }) => {
    if (message.subtype) return;   
    const msg = message as { text?: string; ts: string; thread_ts?: string };
    const sessionId = msg.thread_ts ?? msg.ts;  
    const response = await handleMessage(msg.text ?? '', sessionId);
    await say({ text: response.text, thread_ts: sessionId });
  });

  // @GreenLeaf HR mentions in channels
  app.event('app_mention', async ({ event, say }) => {
    const sessionId = event.thread_ts ?? event.ts;
    const text = event.text.replace(/<@[^>]+>/g, '').trim();   
    const response = await handleMessage(text, sessionId);
    await say({ text: response.text, thread_ts: sessionId });
  });

  await app.start();
  console.log('✅ GreenLeaf Bot running in Slack (Socket Mode)');
}
