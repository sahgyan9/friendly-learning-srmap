// QA for the "What are you into?" welcome-tour step (T3.2): capturing
// interests during the tour. Reuses the exact request-interception + planted
// auth-session approach as qa-welcome-tour.mjs (see that file's header), with
// two additions:
//   - the mocked /rest/v1/users row is mutable per scenario, so we can
//     simulate a fresh user (no interests) vs. a replay with existing ones.
//   - PATCH requests to /rest/v1/users are captured (method + body) instead
//     of just letting them through, so we can assert exactly when a write
//     does/doesn't happen.
//
//   node qa-welcome-tour-interests.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:8083';
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

function freshRow() {
  return {
    id: USER_ID,
    name: 'Test Fresher',
    email: 'fresher@test.local',
    role: 'student',
    is_admin: false,
    profile_image: null,
    verification_status: 'verified',
    has_seen_welcome_tour: false,
    theme: null,
    interests: [],
    interests_discoverable: false,
  };
}

function replayRow() {
  return {
    ...freshRow(),
    has_seen_welcome_tour: true,
    interests: ['machine learning', 'chess', 'photography'],
    interests_discoverable: true,
  };
}

let userRow = freshRow();
const patches = []; // { body } for every PATCH /rest/v1/users observed since last reset

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

  if (!url.includes('supabase.co')) return request.continue();

  if (url.includes('/auth/v1/user')) return respondJson(request, FAKE_SESSION.user);

  if (url.includes('/rest/v1/users')) {
    if (method === 'PATCH') {
      const body = request.postData() || '';
      patches.push({ body });
      let parsed = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        // ignore parse failures, still recorded above
      }
      userRow = { ...userRow, ...parsed };
      return respondJson(request, userRow);
    }
    return respondJson(request, userRow);
  }

  if (url.includes('/rest/v1/mentors')) return respondJson(request, null);

  // RPCs (get_faculty_interest_facets, etc.) and everything else: empty.
  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

// Origin must exist before localStorage can be written (see
// reproduce-signed-in memory), then interception takes over for real loads.
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.setRequestInterception(true);
page.on('request', route);

async function loadApp({ theme, viewport, row }) {
  userRow = row;
  await page.setViewport(viewport);
  await page.evaluate(
    (key, session, themeValue) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem('theme', themeValue);
    },
    `sb-${PROJECT_REF}-auth-token`,
    FAKE_SESSION,
    theme,
  );
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));
}

// On mobile, the hamburger Sheet (also a Radix Dialog under the hood, also
// role="dialog") can still be open behind the WelcomeTour dialog — clicking
// "Take the tour" inside it doesn't auto-close the sheet. So every lookup
// here picks the specific [role="dialog"] that has the tour's progress dots,
// not just the first dialog in the DOM. Defined inside the page via
// evaluateOnNewDocument-style redeclaration in each evaluate() call since
// puppeteer doesn't share function references across page-context calls.
function findTourDialogInPage() {
  return Array.from(document.querySelectorAll('[role="dialog"]')).find((d) =>
    d.querySelector('button[aria-label^="Go to slide"]'),
  );
}

async function jumpToLastStep() {
  await page.waitForFunction(findTourDialogInPage, { timeout: 10000 });
  await page.evaluate(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((d) =>
      d.querySelector('button[aria-label^="Go to slide"]'),
    );
    const dots = Array.from(dialog.querySelectorAll('button[aria-label^="Go to slide"]'));
    dots[dots.length - 1]?.click();
  });
  await new Promise((r) => setTimeout(r, 500));
}

async function clickDialogButton(label) {
  return page.evaluate((text) => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((d) =>
      d.querySelector('button[aria-label^="Go to slide"]'),
    );
    if (!dialog) return false;
    const btn = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === text,
    );
    if (!btn) return false;
    btn.click();
    return true;
  }, label);
}

async function readChips() {
  return page.evaluate(() => {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((d) =>
      d.querySelector('button[aria-label^="Go to slide"]'),
    );
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll('button[aria-label^="Remove "]')).map((b) =>
      b.getAttribute('aria-label').replace('Remove ', ''),
    );
  });
}

async function addChip(text) {
  const selector = 'input[placeholder="Type an interest, press Enter"]';
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.click(selector);
  await page.type(selector, text);
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 150));
}

async function toggleDiscoverable() {
  await page.click('#interests-discoverable');
  await new Promise((r) => setTimeout(r, 150));
}

// Radix's DropdownMenuTrigger opens on real pointer events, not a synthetic
// element.click() dispatched from page.evaluate() — that leaves the menu
// closed with no error. Real page.mouse.click() at the element's center
// is what actually opens/activates it.
async function clickElementCenter(selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
  if (!box) throw new Error(`clickElementCenter: no match for ${selector}`);
  await page.mouse.click(box.x, box.y);
}

async function openReplayFromMenu() {
  // Below the `lg` breakpoint, NavbarProfileMenu only renders inside the
  // hamburger Sheet (SiteHeader.tsx), not the top bar — open that first if
  // the top-bar trigger isn't actually on screen.
  const hamburgerVisible = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Open menu"]');
    return Boolean(btn && btn.offsetParent !== null);
  });
  if (hamburgerVisible) {
    await clickElementCenter('button[aria-label="Open menu"]');
    await new Promise((r) => setTimeout(r, 400));
  }

  const avatarBox = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button.rounded-full.p-0.h-10.w-10'));
    const visible = candidates.find((el) => el.offsetParent !== null);
    if (!visible) return null;
    const r = visible.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!avatarBox) throw new Error('openReplayFromMenu: no visible avatar trigger found');
  await page.mouse.click(avatarBox.x, avatarBox.y);
  await new Promise((r) => setTimeout(r, 300));

  const itemBox = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
    const item = items.find((el) => el.textContent?.trim() === 'Take the tour');
    if (!item) return null;
    const r = item.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!itemBox) throw new Error('openReplayFromMenu: "Take the tour" menu item not found');
  await page.mouse.click(itemBox.x, itemBox.y);
  await new Promise((r) => setTimeout(r, 400));
}

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 360, height: 800 };

const results = {};

// ---------------------------------------------------------------------
// 1. Fresh user, no interests: dialog auto-opens, step should be empty.
//    Screenshot at desktop + mobile, light + dark.
// ---------------------------------------------------------------------
for (const [themeName, theme] of [['light', 'light'], ['dark', 'dark']]) {
  for (const [vpName, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    await loadApp({ theme, viewport: vp, row: freshRow() });
    await jumpToLastStep();
    await page.screenshot({ path: `${OUT}/interests-step-${vpName}-${themeName}-empty.png` });
  }
}
console.log('Captured empty-state screenshots (fresh user, no interests).');

// ---------------------------------------------------------------------
// 2. Fresh user: add two chips + flip the switch, then "Get started".
//    Expect exactly one PATCH with the new interests + discoverable=true.
// ---------------------------------------------------------------------
patches.length = 0;
await loadApp({ theme: 'light', viewport: DESKTOP, row: freshRow() });
await jumpToLastStep();
await addChip('robotics');
await addChip('chess');
await toggleDiscoverable();
const chipsBeforeSave = await readChips();
await clickDialogButton('Get started');
await new Promise((r) => setTimeout(r, 500));
results.freshAdd = { chipsBeforeSave, patches: [...patches] };

// ---------------------------------------------------------------------
// 3. Replay with existing interests: dialog does NOT auto-open (has_seen
//    already true); open via profile menu, jump to the step, confirm the
//    existing interests are pre-filled and editable. Screenshot before
//    touching anything.
// ---------------------------------------------------------------------
for (const [themeName, theme] of [['light', 'light'], ['dark', 'dark']]) {
  for (const [vpName, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    await loadApp({ theme, viewport: vp, row: replayRow() });
    await openReplayFromMenu();
    await jumpToLastStep();
    await page.screenshot({ path: `${OUT}/interests-step-${vpName}-${themeName}-prefilled.png` });
  }
}
console.log('Captured pre-filled screenshots (replay, existing interests).');

// ---------------------------------------------------------------------
// 4. Replay: confirm pre-fill, then "Skip for now" — expect ZERO PATCH.
// ---------------------------------------------------------------------
patches.length = 0;
await loadApp({ theme: 'light', viewport: DESKTOP, row: replayRow() });
await openReplayFromMenu();
await jumpToLastStep();
const prefilledChips = await readChips();
await clickDialogButton('Skip for now');
await new Promise((r) => setTimeout(r, 500));
results.replaySkip = { prefilledChips, patches: [...patches] };

// ---------------------------------------------------------------------
// 5. Replay: confirm "Get started" with NO edits also fires zero PATCH
//    (the changed-check should no-op, not just the skip button).
// ---------------------------------------------------------------------
patches.length = 0;
await loadApp({ theme: 'light', viewport: DESKTOP, row: replayRow() });
await openReplayFromMenu();
await jumpToLastStep();
await clickDialogButton('Get started');
await new Promise((r) => setTimeout(r, 500));
results.replayNoOpFinish = { patches: [...patches] };

await browser.close();

console.log('\n=== Results ===');
console.log(JSON.stringify(results, null, 2));
console.log(errors.length ? `\nErrors:\n${errors.slice(0, 10).join('\n')}` : '\nNo page/console errors.');
console.log(`\nScreenshots in ${OUT}/`);
