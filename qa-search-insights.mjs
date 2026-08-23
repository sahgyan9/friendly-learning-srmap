// Visual QA for /admin/search-insights.
//
// Same technique as qa-signed-in-sweep.mjs: a planted session in localStorage
// plus request interception, so no real backend and no credentials are
// involved. Captures both states that matter — populated, and the empty state
// a fresh install actually shows.
//
//   node qa-search-insights.mjs [baseUrl] [outDir]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5179';
const OUT = process.argv[3] || '.qa-search-insights';
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
    email: 'admin@test.local',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const SCENARIO = { populated: true };

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

// Deliberately covers every branch the page renders: a zero-result query, a
// query with results nobody clicked, one that is both, and a healthy one.
const ANALYTICS_ROWS = [
  { query_hash: 'h1', query_text: 'where do i return a library book', search_count: 9, zero_result_count: 9, click_count: 0, first_searched_at: daysAgo(20), last_searched_at: daysAgo(1) },
  { query_hash: 'h2', query_text: 'hostel laundry timings', search_count: 6, zero_result_count: 6, click_count: 0, first_searched_at: daysAgo(15), last_searched_at: daysAgo(2) },
  { query_hash: 'h3', query_text: 'machine learning faculty', search_count: 41, zero_result_count: 0, click_count: 28, first_searched_at: daysAgo(30), last_searched_at: daysAgo(0) },
  { query_hash: 'h4', query_text: 'convocation dress code', search_count: 7, zero_result_count: 0, click_count: 0, first_searched_at: daysAgo(9), last_searched_at: daysAgo(3) },
  { query_hash: 'h5', query_text: 'quantum computing professor', search_count: 12, zero_result_count: 0, click_count: 9, first_searched_at: daysAgo(11), last_searched_at: daysAgo(1) },
  { query_hash: 'h6', query_text: 'internship in germany', search_count: 4, zero_result_count: 2, click_count: 0, first_searched_at: daysAgo(6), last_searched_at: daysAgo(4) },
];

function profileRow() {
  return {
    id: USER_ID,
    name: 'Admin Priya',
    email: 'admin@test.local',
    role: 'student',
    is_admin: true,
    profile_image: null,
    verification_status: 'verified',
    has_seen_welcome_tour: true,
  };
}

function respondJson(request, body, status = 200) {
  return request.respond({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'content-range',
      'content-range': '0-0/*',
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
  if (url.includes('/rest/v1/search_analytics')) {
    return respondJson(request, SCENARIO.populated ? ANALYTICS_ROWS : []);
  }
  if (url.includes('/rest/v1/users')) return respondJson(request, profileRow());

  // Anything else the shell happens to ask for.
  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(name, tabLabel) {
  await page.goto(`${BASE}/admin/search-insights`, { waitUntil: 'networkidle2' });
  await wait(1200);

  if (tabLabel) {
    // A real mouse click, not element.click(). Radix tab triggers activate on
    // focus/pointer events, so a synthetic click dispatches but changes
    // nothing — which looks exactly like a broken tab in the screenshot.
    const handles = await page.$$('[role="tab"]');
    let clicked = false;
    for (const handle of handles) {
      const text = await page.evaluate((el) => el.textContent.toLowerCase(), handle);
      if (text.includes(tabLabel)) {
        await handle.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) errors.push(`tab "${tabLabel}" not found`);
    await wait(600);
  }

  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });

  const summary = await page.evaluate(() => ({
    heading: document.querySelector('h1')?.textContent?.trim() ?? null,
    tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()),
    rows: [...document.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td')].slice(0, 3).map((td) => td.textContent.trim()),
    ),
    empty: document.body.innerText.includes('No dead ends')
      || document.body.innerText.includes('No searches recorded yet'),
  }));

  console.log(`\n── ${name} ─────────────────────────────`);
  console.log(JSON.stringify(summary, null, 1));
  console.log(`   saved ${file}`);
  return summary;
}

await capture('01-found-nothing', null);
await capture('02-nothing-clicked', 'nothing clicked');
await capture('03-most-searched', 'most searched');

SCENARIO.populated = false;
await capture('04-empty-state', null);

await browser.close();

if (errors.length > 0) {
  console.log(`\n${errors.length} page error(s):`);
  errors.forEach((e) => console.log(`  ${e}`));
  process.exit(1);
}
console.log('\nNo page errors.');
