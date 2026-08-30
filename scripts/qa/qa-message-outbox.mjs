// Visual QA for the message outbox: a message written offline and one that
// gave up, in the conversation list and in the thread.
//
// Same technique as qa-signed-in-sweep.mjs — a planted session, request
// interception, a controlled Supabase surface, no real backend — plus a
// pre-seeded outbox in localStorage.
//
//   node scripts/qa/qa-message-outbox.mjs [baseUrl] [outDir]
//
// The browser is reported as offline by default, which is the state the
// outbox exists for and what stops the app-level sync from flushing the queue
// before it can be photographed. Two switches:
//
//   QA_OFFLINE=0    online, so the sync sends the queued message on load —
//                   the toast and the emptied queue are the proof it works
//   QA_CASE=queued  one queued message and no failures, the common case,
//                   where the clock has to be on the message itself
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5178';
const OUT = process.argv[3] || '.qa-outbox';
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_REF = 'ruapdkrgcbqrhvsayvpf';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-0000000000a1';

const FAKE_SESSION = {
  access_token: 'fake.jwt.token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fake-refresh-token',
  user: {
    id: USER_ID, aud: 'authenticated', role: 'authenticated',
    email: 'fresher@test.local', app_metadata: {}, user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const ALL_OUTBOX = [
  {
    localId: 'local-1', conversationId: 'conv-1', senderId: USER_ID, receiverId: OTHER,
    content: 'Sent this one from the metro tunnel', replyToId: null, replyTo: null,
    queuedAt: new Date(Date.now() - 120000).toISOString(), attempts: 0,
  },
  {
    localId: 'local-2', conversationId: 'conv-1', senderId: USER_ID, receiverId: OTHER,
    content: 'And this one gave up', replyToId: null, replyTo: null,
    queuedAt: new Date(Date.now() - 60000).toISOString(), attempts: 5,
    lastError: 'Failed to fetch', failed: true,
  },
];

// QA_CASE=queued isolates the common case — one message written offline, no
// failures — where the clock has to be visible on the message itself.
const OUTBOX = process.env.QA_CASE === 'queued' ? [ALL_OUTBOX[0]] : ALL_OUTBOX;

const respond = (request, body, headers = {}) =>
  request.respond({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'content-range': `0-${Math.max(0, (Array.isArray(body) ? body.length : 1) - 1)}/${Array.isArray(body) ? body.length : 1}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });

function singleOrList(request, row) {
  const accept = request.headers()['accept'] || '';
  return respond(request, accept.includes('pgrst.object') ? row : [row]);
}

const profile = {
  id: USER_ID, name: 'Asha Kumar', email: 'fresher@test.local', role: 'student',
  profile_image: null, department: 'Computer Science', is_admin: false,
};

const conversation = {
  id: 'conv-1', user1_id: USER_ID, user2_id: OTHER, last_message_id: 'm-1',
  last_updated: new Date(Date.now() - 600000).toISOString(),
};

const serverMessage = {
  id: 'm-1', conversation_id: 'conv-1', content: 'Hey! Are you free for a call?',
  sent_at: new Date(Date.now() - 600000).toISOString(),
  sender_id: OTHER, receiver_id: USER_ID, is_read: true, delivery_status: 'read',
};

function route(request) {
  const url = request.url();
  if (!url.includes('supabase.co')) return request.continue();
  if (request.method() === 'OPTIONS') {
    return request.respond({
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Expose-Headers': 'content-range',
      },
    });
  }

  if (url.includes('/auth/v1/')) return respond(request, FAKE_SESSION.user);
  if (url.includes('/rest/v1/users')) return singleOrList(request, profile);
  if (url.includes('/rest/v1/mentors')) {
    const accept = request.headers()['accept'] || '';
    return respond(request, accept.includes('pgrst.object') ? null : []);
  }
  if (url.includes('/rest/v1/conversations')) return respond(request, [conversation]);
  if (url.includes('/rest/v1/messages')) return respond(request, []);

  if (url.includes('/rpc/')) {
    const name = url.split('/rpc/')[1].split('?')[0];
    if (name === 'is_admin_user') return respond(request, false);
    if (name === 'get_conversation_messages') return respond(request, [serverMessage]);
    if (name === 'chat_participant_profiles') {
      return respond(request, [{ id: OTHER, name: 'Rahul Verma', profile_image: null, role: 'mentor' }]);
    }
    return respond(request, null);
  }
  return respond(request, []);
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 850 });

// Report the browser as offline without cutting the page off from the stubbed
// backend: this is the state the outbox exists for, and it stops the app-level
// sync from flushing the queue before it can be seen.
if (process.env.QA_OFFLINE !== '0') {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
  });
}

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate((key, session, outboxKey, outbox) => {
  localStorage.setItem(key, JSON.stringify(session));
  localStorage.setItem(outboxKey, JSON.stringify({ data: outbox, savedAt: Date.now() }));
  localStorage.setItem('theme', 'light');
}, `sb-${PROJECT_REF}-auth-token`, FAKE_SESSION, 'fl_offline_cache:message_outbox', OUTBOX);

await page.setRequestInterception(true);
page.on('request', route);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle2', timeout: 45000 });
await wait(2500);
await page.screenshot({ path: path.join(OUT, 'conversation-list.png'), fullPage: false });

const listText = await page.evaluate(() => document.body.innerText);
console.log('list shows queued preview:', listText.includes('And this one gave up'));

await page.goto(`${BASE}/messages/conv-1`, { waitUntil: 'networkidle2', timeout: 45000 });
await wait(2500);
await page.screenshot({ path: path.join(OUT, 'thread.png'), fullPage: false });

const thread = await page.evaluate(() => ({
  text: document.body.innerText,
  retryButtons: [...document.querySelectorAll('button')].filter((b) => b.textContent.includes('Retry')).length,
  clocks: document.querySelectorAll('[aria-label="Waiting to send"]').length,
  alerts: document.querySelectorAll('[aria-label="Not sent"]').length,
}));

console.log('thread shows queued message:', thread.text.includes('metro tunnel'));
console.log('thread shows failed message: ', thread.text.includes('gave up'));
console.log('retry buttons:', thread.retryButtons, '| clock icons:', thread.clocks, '| alert icons:', thread.alerts);
console.log('page errors:', errors.length ? errors.slice(0, 5) : 'none');

await browser.close();
