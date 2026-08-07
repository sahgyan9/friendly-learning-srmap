// Visual QA for owner-created channels in a group workspace.
//
// Signed in as the group's owner, with the Supabase REST/RPC surface stubbed,
// so the sidebar renders its channel list, the add button, and the create
// modal without touching the real database. Same approach as
// qa-welcome-tour.mjs: a planted session in localStorage plus request
// interception (see the reproduce-signed-in-browser notes).
//
//   node qa-group-channels.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:5178';
const OUT = '.qa';
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_REF = 'ruapdkrgcbqrhvsayvpf';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const COMMUNITY_ID = '00000000-0000-4000-8000-0000000000c0';
const SLUG = 'sih-team-alpha';

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
    email: 'owner@test.local',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const PROFILE_ROW = {
  id: USER_ID,
  name: 'Test Owner',
  email: 'owner@test.local',
  role: 'student',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  has_seen_welcome_tour: true,
  theme: null,
};

// get_community returns a SET, and the service takes row [0] and maps a flat
// row (owner_id/owner_name/...) into the nested Community shape. Stubbing the
// already-mapped object silently produces "that group doesn't exist".
const COMMUNITY_ROW = {
  id: COMMUNITY_ID,
  slug: SLUG,
  name: 'SIH Team Alpha',
  description: 'Building our entry for Smart India Hackathon 2026. Frontend help welcome.',
  kind: 'hackathon',
  cover_image: null,
  member_count: 7,
  post_count: 2,
  is_archived: false,
  created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
  last_activity_at: new Date(Date.now() - 3600000).toISOString(),
  owner_id: USER_ID,
  owner_name: 'Test Owner',
  owner_image: null,
  owner_is_mentor: false,
  viewer_is_member: true,
  viewer_is_owner: true,
  viewer_can_post: true,
  visibility: 'public',
  viewer_has_requested: false,
  viewer_has_invite: false,
  viewer_can_view: true,
  pending_request_count: 0,
};

// Two channels the owner made, one busy and one empty — the empty one is what
// the old fixed-channel design produced by default and is worth looking at.
const CHANNELS = [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    slug: 'resources',
    topic: 'Links, notes and slides worth keeping',
    created_by: USER_ID,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    message_count: 12,
  },
  {
    id: '00000000-0000-4000-8000-0000000000a2',
    slug: 'announcements',
    topic: null,
    created_by: USER_ID,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    message_count: 0,
  },
];

const message = (id, content, minutesAgo) => ({
  id,
  sender_id: USER_ID,
  sender_name: 'Test Owner',
  sender_avatar: null,
  is_owner: true,
  is_mentor: false,
  channel: 'general',
  content,
  reply_to_id: null,
  reply_to_sender_name: null,
  reply_to_content: null,
  reactions: {},
  viewer_reactions: [],
  created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
});

const GENERAL_MESSAGES = [
  message('m1', 'Starting this for SIH prep — drop your name and what you are good at.', 180),
  message('m2', 'I can take the backend. Anyone comfortable with React?', 150),
];

const RESOURCES_MESSAGES = [
  { ...message('m3', 'Parking the problem statement PDF here so it stops getting lost.', 90), channel: 'resources' },
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

const seenRpcs = new Set();

async function route(request) {
  const url = request.url();

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

  if (!url.includes('supabase.co')) return request.continue();

  if (url.includes('/auth/v1/user')) return respondJson(request, FAKE_SESSION.user);
  if (url.includes('/rest/v1/users')) return respondJson(request, PROFILE_ROW);
  if (url.includes('/rest/v1/mentors')) return respondJson(request, null);

  if (url.includes('/rpc/')) {
    const name = url.split('/rpc/')[1].split('?')[0];
    seenRpcs.add(name);

    if (name === 'get_community') return respondJson(request, [COMMUNITY_ROW]);
    if (name === 'list_community_channels') return respondJson(request, CHANNELS);
    if (name === 'list_group_messages') {
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch {
        body = {};
      }
      const channel = body.p_channel ?? 'general';
      if (channel === 'general') return respondJson(request, GENERAL_MESSAGES);
      if (channel === 'resources') return respondJson(request, RESOURCES_MESSAGES);
      return respondJson(request, []); // #announcements is empty on purpose
    }
    if (name === 'create_community_channel') {
      return respondJson(request, '00000000-0000-4000-8000-0000000000a3');
    }
  }

  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(
  (key, session) => localStorage.setItem(key, JSON.stringify(session)),
  `sb-${PROJECT_REF}-auth-token`,
  FAKE_SESSION,
);

await page.setRequestInterception(true);
page.on('request', route);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await page.goto(`${BASE}/communities/${SLUG}`, { waitUntil: 'networkidle2', timeout: 45000 });
await wait(1800);

// What the sidebar actually rendered.
const sidebar = await page.evaluate(() => {
  const labels = Array.from(document.querySelectorAll('aside button')).map((b) =>
    b.textContent.trim().replace(/\s+/g, ' '),
  );
  const addButton = document.querySelector('aside button[aria-label="Add a channel"]');
  return {
    labels,
    hasAddButton: Boolean(addButton),
    addDisabled: addButton ? addButton.disabled : null,
    removeButtons: document.querySelectorAll('aside button[aria-label^="Remove #"]').length,
  };
});
console.log('sidebar entries :', sidebar.labels);
console.log('add button      :', sidebar.hasAddButton, '| disabled:', sidebar.addDisabled);
console.log('remove buttons  :', sidebar.removeButtons);
await page.screenshot({ path: `${OUT}/channels-1-sidebar.png` });

// Open a channel and confirm its own stream loads.
const openedChannel = await page.evaluate(() => {
  const target = Array.from(document.querySelectorAll('aside button')).find((b) =>
    b.textContent.includes('resources'),
  );
  if (!target) return false;
  target.click();
  return true;
});
await wait(1200);
const composer = await page.evaluate(() => {
  const input = document.querySelector('input[aria-label^="Write a message"]');
  return input ? input.placeholder : null;
});
console.log('opened #resources:', openedChannel, '| composer:', composer);
await page.screenshot({ path: `${OUT}/channels-2-resources.png` });

// The empty channel: its topic-or-fallback empty state, no group starters.
await page.evaluate(() => {
  const target = Array.from(document.querySelectorAll('aside button')).find((b) =>
    b.textContent.includes('announcements'),
  );
  target?.click();
});
await wait(1200);
const emptyState = await page.evaluate(() => {
  const heading = Array.from(document.querySelectorAll('h4')).map((h) => h.textContent.trim());
  const starters = Array.from(document.querySelectorAll('button')).filter((b) =>
    b.className.includes('border-dashed'),
  ).length;
  return { heading, starters };
});
console.log('empty channel   :', JSON.stringify(emptyState));
await page.screenshot({ path: `${OUT}/channels-3-empty.png` });

// The create modal.
await page.evaluate(() => {
  document.querySelector('aside button[aria-label="Add a channel"]')?.click();
});
await wait(700);
await page.evaluate(() => {
  const input = document.querySelector('#channel-name');
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'Reading group & notes');
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(500);
const preview = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return dialog ? dialog.textContent.replace(/\s+/g, ' ').trim() : null;
});
console.log('modal           :', preview?.slice(0, 220));
await page.screenshot({ path: `${OUT}/channels-4-create-modal.png` });

// Mobile.
await page.keyboard.press('Escape');
await wait(400);
await page.setViewport({ width: 390, height: 844 });
await wait(600);
await page.screenshot({ path: `${OUT}/channels-5-mobile.png`, fullPage: true });

console.log('\nrpcs called     :', [...seenRpcs].join(', '));
console.log(errors.length ? `\npage errors:\n  ${errors.join('\n  ')}` : '\nno page errors');

await browser.close();
