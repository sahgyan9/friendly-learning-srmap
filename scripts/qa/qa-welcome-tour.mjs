// Visual QA for the WelcomeTour onboarding modal, signed in as a fake
// first-time user (has_seen_welcome_tour: false). Follows the same
// request-interception approach as qa-faculty-mock.mjs, plus a planted
// auth session in localStorage so AuthContext sees a signed-in user without
// real credentials.
//
//   node qa-welcome-tour.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:5178';
const OUT = '.qa';
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_REF = 'ruapdkrgcbqrhvsayvpf';
const USER_ID = '00000000-0000-4000-8000-000000000001';

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
    email: 'fresher@test.local',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const PROFILE_ROW = {
  id: USER_ID,
  name: 'Test Fresher',
  email: 'fresher@test.local',
  role: 'student',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  has_seen_welcome_tour: false,
  theme: null,
};

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

  // Every other Supabase call (RPCs, community feed, faculty, notifications,
  // messages...) just gets an empty result. Irrelevant to whether the tour
  // renders — those sections show empty states instead, which is fine here.
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
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

// Origin must exist before localStorage can be written, then reload so the
// app boots with the session already present (see reproduce-signed-in memory).
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(
  (key, session) => localStorage.setItem(key, JSON.stringify(session)),
  `sb-${PROJECT_REF}-auth-token`,
  FAKE_SESSION,
);

await page.setRequestInterception(true);
page.on('request', route);

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise((resolve) => setTimeout(resolve, 2000));

const dialogVisible = await page.$('[role="dialog"]').then(Boolean);
console.log(`dialog present: ${dialogVisible}`);

await page.screenshot({ path: `${OUT}/welcome-tour-step1.png` });

if (dialogVisible) {
  // Click the "Next" button in the dialog footer.
  const clicked = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const next = buttons.find((b) => b.textContent?.trim() === 'Next');
    if (!next) return false;
    next.click();
    return true;
  });
  console.log(`advanced to step 2: ${clicked}`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.screenshot({ path: `${OUT}/welcome-tour-step2.png` });
}

await page.setViewport({ width: 390, height: 844 });
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: `${OUT}/welcome-tour-mobile.png` });

console.log(errors.length ? `\nErrors:\n${errors.slice(0, 10).join('\n')}` : '\nNo page/console errors.');
console.log(`\nScreenshots in ${OUT}/`);

await browser.close();
