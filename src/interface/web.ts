import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { handleMessage } from '../agent/orchestrator.js';

const MAX_BODY_BYTES = 10_000;

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GreenLeaf HR Assistant</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; display: flex; flex-direction: column;
         height: 100dvh; max-width: 720px; margin-inline: auto; padding: 0 12px; }
  header { padding: 14px 4px; font-weight: 600; border-bottom: 1px solid #8884; }
  header small { font-weight: 400; opacity: .7; }
  #log { flex: 1; overflow-y: auto; padding: 12px 0; display: flex; flex-direction: column; gap: 10px; }
  .msg { padding: 10px 14px; border-radius: 12px; max-width: 85%; white-space: pre-wrap; line-height: 1.4; }
  .user { align-self: flex-end; background: #2e7d32; color: #fff; }
  .bot  { align-self: flex-start; background: #8883; }
  form { display: flex; gap: 8px; padding: 12px 0; border-top: 1px solid #8884; }
  input { flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid #8886; font-size: 1rem; }
  button { padding: 10px 18px; border-radius: 10px; border: 0; background: #2e7d32; color: #fff;
           font-size: 1rem; cursor: pointer; }
  button:disabled { opacity: .5; }
</style>
</head>
<body>
<header>🌿 GreenLeaf HR Assistant <small>· internal Tier-1 HR questions</small></header>
<div id="log"></div>
<form id="f">
  <input id="q" placeholder="e.g. Can I expense a 30 CHF client lunch?" autocomplete="off" autofocus>
  <button id="send">Send</button>
</form>
<script>
  // One conversation per browser tab, survives reloads
  let sid = sessionStorage.getItem('sid');
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem('sid', sid); }

  const log = document.getElementById('log');
  const form = document.getElementById('f');
  const input = document.getElementById('q');
  const send = document.getElementById('send');

  function add(cls, text) {
    const div = document.createElement('div');
    div.className = 'msg ' + cls;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    add('user', message);
    send.disabled = true;
    const pending = add('bot', '…');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: sid })
      });
      const data = await res.json();
      pending.textContent = data.text ?? 'Something went wrong.';
    } catch {
      pending.textContent = 'Connection error — please try again.';
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
</script>
</body>
</html>`;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf-8')));
    req.on('error', reject);
  });
}

async function handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = JSON.parse(await readBody(req)) as { message?: unknown; sessionId?: unknown };

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const sessionId = typeof body.sessionId === 'string' && body.sessionId.length <= 64
      ? body.sessionId
      : randomUUID();

    if (!message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'message is required' }));
      return;
    }

    const response = await handleMessage(message, sessionId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ text: response.text, intent: response.intent, escalated: response.escalated }));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid request' }));
  }
}

export async function startWeb(): Promise<void> {
  const port = parseInt(process.env.PORT ?? '3000');

  const server = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE);
      return;
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      void handleChat(req, res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  server.listen(port, () => {
    console.log(`✅ GreenLeaf HR Assistant on http://localhost:${port}`);
  });
}
