// QA Harness: Mobile Chat Viewport & iOS Keyboard Jump Verification
// Tests iPhone 15 Pro Max (keyboard closed & open) and Desktop layout
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8083';
const OUT = '.qa-chat-viewport';
fs.mkdirSync(OUT, { recursive: true });

const USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';
const CONV_ID = 'c-00000000-0000-4000-8000-000000000001';

const FAKE_SESSION = {
  access_token: 'fake.jwt.token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fake-refresh-token',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'asha@srmap.edu.in',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const PROFILE_ROW = {
  id: USER_ID,
  name: 'Asha Kumar',
  email: 'asha@srmap.edu.in',
  role: 'student',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  has_seen_welcome_tour: true,
  theme: 'light',
};

const OTHER_PROFILE = {
  id: OTHER_USER_ID,
  name: 'Priya Sharma (Senior Mentor)',
  email: 'priya@srmap.edu.in',
  role: 'mentor',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  department: 'Computer Science',
};

const CONVERSATION_ROW = {
  id: CONV_ID,
  user1_id: USER_ID,
  user2_id: OTHER_USER_ID,
  created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  updated_at: new Date().toISOString(),
  user1: PROFILE_ROW,
  user2: OTHER_PROFILE,
};

const SAMPLE_MESSAGES = [
  {
    id: 'm-1',
    conversation_id: CONV_ID,
    sender_id: OTHER_USER_ID,
    receiver_id: USER_ID,
    content: 'Hi Asha! Welcome to SRMAP. How can I help you with your coursework or research?',
    sent_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: true,
    delivery_status: 'read',
    sender: OTHER_PROFILE,
  },
  {
    id: 'm-2',
    conversation_id: CONV_ID,
    sender_id: USER_ID,
    receiver_id: OTHER_USER_ID,
    content: 'Hi Priya! I had a quick doubt about Operating Systems assignments and project selection.',
    sent_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    is_read: true,
    delivery_status: 'read',
    sender: PROFILE_ROW,
  },
  {
    id: 'm-3',
    conversation_id: CONV_ID,
    sender_id: OTHER_USER_ID,
    receiver_id: USER_ID,
    content: 'Sure! For OS, focusing on concurrency primitives (mutex, semaphores) and virtual memory paging is crucial. Are you looking for team partners too?',
    sent_at: new Date(Date.now() - 1800000).toISOString(),
    is_read: true,
    delivery_status: 'read',
    sender: OTHER_PROFILE,
  },
  {
    id: 'm-4',
    conversation_id: CONV_ID,
    sender_id: USER_ID,
    receiver_id: OTHER_USER_ID,
    content: 'Yes exactly! We are forming a team for the upcoming hackathon as well.',
    sent_at: new Date(Date.now() - 600000).toISOString(),
    is_read: false,
    delivery_status: 'delivered',
    sender: PROFILE_ROW,
  },
];

function respondJson(request, body, status = 200) {
  return request.respond({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'content-range': `0-${Math.max(0, (Array.isArray(body) ? body.length : 1) - 1)}/${
        Array.isArray(body) ? body.length : 1
      }`,
    },
    body: JSON.stringify(body),
  });
}

async function route(request) {
  const url = request.url();
  const method = request.method();

  if (method === 'OPTIONS') {
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

  // Supabase Auth
  if (url.includes('/auth/v1/user') || url.includes('/auth/v1/session')) {
    return respondJson(request, FAKE_SESSION.user);
  }

  // User profiles
  if (url.includes('/rest/v1/users')) {
    if (url.includes(`id=eq.${USER_ID}`)) {
      return respondJson(request, [PROFILE_ROW]);
    }
    if (url.includes(`id=eq.${OTHER_USER_ID}`)) {
      return respondJson(request, [OTHER_PROFILE]);
    }
    return respondJson(request, [PROFILE_ROW, OTHER_PROFILE]);
  }

  // Chat participant profiles RPC
  if (url.includes('chat_participant_profiles')) {
    return respondJson(request, [
      { id: USER_ID, name: 'Asha Kumar', profile_image: null, role: 'student' },
      { id: OTHER_USER_ID, name: 'Priya Sharma', profile_image: null, role: 'mentor' },
    ]);
  }

  // Mentors table
  if (url.includes('/rest/v1/mentors')) {
    return respondJson(request, [
      { id: OTHER_USER_ID, name: 'Priya Sharma', profile_image: null },
    ]);
  }

  // Conversations
  if (url.includes('/rest/v1/conversations')) {
    return respondJson(request, [CONVERSATION_ROW]);
  }

  // Messages
  if (url.includes('/rest/v1/messages')) {
    if (method === 'POST') {
      const postData = JSON.parse(request.postData() || '{}');
      const newMsg = {
        id: `m-${Date.now()}`,
        conversation_id: postData.conversation_id || CONV_ID,
        sender_id: USER_ID,
        receiver_id: OTHER_USER_ID,
        content: postData.content || '',
        sent_at: new Date().toISOString(),
        is_read: false,
        delivery_status: 'sent',
        sender: PROFILE_ROW,
      };
      return respondJson(request, [newMsg], 201);
    }
    return respondJson(request, SAMPLE_MESSAGES);
  }

  // Unread counts RPC or queries
  if (url.includes('get_conversation_unread_counts') || url.includes('unread')) {
    return respondJson(request, []);
  }

  // Fallback 200 empty
  if (url.includes('/rest/v1/')) {
    return respondJson(request, []);
  }

  return request.continue();
}

async function run() {
  console.log('Launching browser for Mobile Chat Viewport QA...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', route);

  // Set fake auth session in localStorage before navigating
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ sessionKey, session }) => {
      localStorage.setItem(sessionKey, JSON.stringify(session));
      localStorage.setItem('theme', 'light');
    },
    {
      sessionKey: `sb-ruapdkrgcbqrhvsayvpf-auth-token`,
      session: FAKE_SESSION,
    },
  );

  console.log('Testing iPhone 15 Pro Max portrait (430x932) - Keyboard Closed...');
  await page.setViewport({
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`${BASE}/messages/${CONV_ID}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(OUT, '01-iphone-chat-keyboard-closed.png') });

  console.log('Testing iPhone 15 Pro Max - Keyboard OPEN simulation (visual viewport shrinks to 516px)...');
  // Simulate keyboard opening by resizing viewport height to 516px (932 - ~416px keyboard & accessory bar)
  await page.setViewport({
    width: 430,
    height: 516,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  // Focus the message input textarea
  await page.evaluate(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      textarea.value = 'Sounds great! Let’s meet at the library.';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Check metrics
  const metrics = await page.evaluate(() => {
    const inputForm = document.querySelector('form');
    const header = document.querySelector('header');
    const scroller = document.querySelector('[data-testid="message-scroller"]');
    const formRect = inputForm ? inputForm.getBoundingClientRect() : null;
    const headerRect = header ? header.getBoundingClientRect() : null;

    return {
      windowScrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      headerVisible: headerRect ? headerRect.top >= 0 && headerRect.bottom > 0 : false,
      headerTop: headerRect ? headerRect.top : null,
      formBottom: formRect ? formRect.bottom : null,
      formTop: formRect ? formRect.top : null,
      distanceFromBottom: formRect ? window.innerHeight - formRect.bottom : null,
      scrollerHeight: scroller ? scroller.clientHeight : null,
    };
  });

  console.log('Measured Metrics with Keyboard Open:', JSON.stringify(metrics, null, 2));

  await page.screenshot({ path: path.join(OUT, '02-iphone-chat-keyboard-open.png') });

  console.log('Testing iPhone 15 Pro Max Conversation List (/messages)...');
  await page.setViewport({
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT, '03-iphone-messages-list.png') });

  console.log('Testing Desktop Light Mode (1280x800)...');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/messages/${CONV_ID}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT, '04-desktop-chat-light.png') });

  console.log('Testing Desktop Dark Mode (1280x800)...');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '05-desktop-chat-dark.png') });

  console.log(`\nQA Test Complete! Screenshots saved to ${OUT}/`);
  await browser.close();
}

run().catch((err) => {
  console.error('QA Test failed:', err);
  process.exit(1);
});
