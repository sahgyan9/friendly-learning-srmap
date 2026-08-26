// Visual QA for T2.2: the signed-in homepage "people who match your interests"
// module (src/components/home/RecommendedPeople.tsx). Same technique as
// qa-signed-in-sweep.mjs: a planted session in localStorage, request
// interception, and a controlled Supabase REST/RPC + edge-function surface.
//
//   node qa-recommended-people.mjs [baseUrl] [outDir]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8083';
const OUT = process.argv[3] || '.qa-recommended-people';
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_REF = 'ruapdkrgcbqrhvsayvpf';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const MENTOR_A = '00000000-0000-4000-8000-0000000000a1';
const FACULTY_A = '00000000-0000-4000-8000-0000000000f1';
const STUDENT_A = '00000000-0000-4000-8000-0000000000s1';

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

// SCENARIO.hasInterests toggles between the three variants:
//   true  -> department + interests populated -> module with results
//   false -> no department, no interests       -> prompt card
//   (signed-out variant is a separate run with no planted session at all)
const SCENARIO = { hasInterests: true };

function profileRow() {
  return {
    id: USER_ID,
    name: 'Asha Kumar',
    email: 'fresher@test.local',
    role: 'student',
    is_admin: false,
    profile_image: null,
    verification_status: 'verified',
    has_seen_welcome_tour: true,
    theme: null,
    mobile: null,
    department: SCENARIO.hasInterests ? 'Computer Science' : null,
    skills: SCENARIO.hasInterests ? ['python', 'react'] : [],
    interests: SCENARIO.hasInterests ? ['robotics', 'machine learning', 'ai'] : [],
    interests_discoverable: SCENARIO.hasInterests,
    linkedin_url: null,
    bio: null,
    is_available: true,
  };
}

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

function semanticSearchResponse(query) {
  return {
    query,
    cached: false,
    total: 3,
    faculty: [
      {
        entity_type: 'faculty',
        entity_id: FACULTY_A,
        title: 'Dr. Priya Nair',
        subtitle: 'Computer Science · Professor',
        metadata: { interests: ['machine learning', 'robotics'], image_url: null, slug: 'priya-nair' },
        source_path: '/faculty/priya-nair',
        similarity: 0.82,
      },
    ],
    mentors: [
      {
        entity_type: 'mentor',
        entity_id: MENTOR_A,
        title: 'Rahul Verma',
        subtitle: 'Computer Science · 3rd Year',
        metadata: { skills: ['react', 'python'], profile_image: null },
        source_path: `/mentor/${MENTOR_A}`,
        similarity: 0.77,
      },
    ],
    students: [
      {
        entity_type: 'student',
        entity_id: STUDENT_A,
        title: 'Meera Iyer',
        subtitle: 'Computer Science',
        metadata: { interests: ['robotics', 'ai'], profile_image: null },
        source_path: null,
        similarity: 0.71,
      },
    ],
    opportunities: [],
    communities: [],
    posts: [],
    other: [],
  };
}

// ---------------------------------------------------------------------------
// Request capture: every semantic-search call's parsed body, in call order.
// ---------------------------------------------------------------------------
const semanticSearchCalls = [];

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

  if (url.includes('/functions/v1/semantic-search')) {
    let body = {};
    try {
      body = JSON.parse(request.postData() || '{}');
    } catch {
      // leave body as {}
    }
    semanticSearchCalls.push(body);
    return respondJson(request, semanticSearchResponse(body.query ?? ''));
  }

  if (url.includes('/rest/v1/users')) {
    // Every /rest/v1/users read in this flow — AuthContext's own-profile
    // select and RecommendedPeople's dedicated `interests` read — is a single
    // own-row lookup; profileRow() carries every field either could ask for,
    // so one fixture body correctly answers both regardless of `select=`.
    return respondJson(request, profileRow());
  }

  if (url.includes('/rest/v1/mentors')) return respondJson(request, null);
  if (url.includes('/rest/v1/mentor_verifications')) return respondJson(request, null);
  if (url.includes('/rest/v1/notifications')) return respondJson(request, []);
  if (url.includes('/rest/v1/community_posts')) return respondJson(request, []);
  if (url.includes('/rest/v1/communities')) return respondJson(request, []);
  if (url.includes('/rest/v1/faculty')) return respondJson(request, []);
  if (url.includes('/rest/v1/opportunities')) return respondJson(request, []);
  if (url.includes('/rest/v1/marketplace_posts')) return respondJson(request, []);

  if (url.includes('/rpc/')) {
    const name = url.split('/rpc/')[1].split('?')[0];
    if (name === 'is_admin_user') return respondJson(request, false);
    if (name === 'get_faculty_directory_stats') return respondJson(request, [{ faculty_count: 12, rating_count: 40, department_count: 6 }]);
    if (name === 'get_top_rated_faculty') return respondJson(request, []);
    if (name === 'get_faculty_interest_facets') return respondJson(request, []);
    if (name === 'list_communities') return respondJson(request, []);
    if (name === 'get_community_feed') return respondJson(request, []);
    return respondJson(request, null);
  }

  return respondJson(request, []);
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();

let errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function plantSession() {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (key, session) => localStorage.setItem(key, JSON.stringify(session)),
    `sb-${PROJECT_REF}-auth-token`,
    FAKE_SESSION,
  );
}

async function clearSession() {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key) => localStorage.removeItem(key), `sb-${PROJECT_REF}-auth-token`);
}

async function shot(name, { viewport, light = false, hasInterests = true, signedIn = true, waitMs = 2500, freshCache = false }) {
  SCENARIO.hasInterests = hasInterests;
  await page.evaluate((l) => {
    try {
      localStorage.setItem('theme', l ? 'light' : 'dark');
    } catch {}
  }, light);
  await page.setViewport(viewport);
  errors = [];

  if (freshCache) {
    // Simulate a genuinely separate page load (not "navigate back" within the
    // same session): wipe the sessionStorage cache *before* navigating, so the
    // component mounts with no cache to find and is forced to make a real
    // semantic-search call instead of reusing a cached one from an earlier
    // shot in this same script run. Clearing after goto would be too late —
    // the component checks the cache during its very first effect pass.
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch {}
    });
  }

  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 45000 });
  // Scroll toward where the module lives (hero-adjacent, so a modest scroll
  // clears its 600px IntersectionObserver rootMargin trigger).
  await page.evaluate(() => window.scrollTo(0, 400));
  await wait(waitMs);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const hasSpinner = await page.evaluate(() => Boolean(document.querySelector('.animate-spin')));
  const moduleText = await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('h2')).find((h) =>
      h.textContent?.includes('People who match your interests'),
    );
    return heading ? heading.closest('section')?.innerText ?? null : null;
  });
  const promptCardText = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('p')).find((p) => p.textContent?.includes("Tell us what you're into"));
    return el ? el.closest('section')?.innerText ?? null : null;
  });

  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

  console.log(
    `${name.padEnd(38)} overflow=${String(overflow).padEnd(5)} spinner=${String(hasSpinner).padEnd(5)} module=${String(
      Boolean(moduleText),
    ).padEnd(5)} promptCard=${String(Boolean(promptCardText)).padEnd(5)} errors=${errors.length}`,
  );
  if (errors.length) console.log('   ' + errors.slice(0, 5).join('\n   '));

  return { name, overflow, hasSpinner, moduleText, promptCardText, errors: [...errors] };
}

const results = [];

// ---- Variant 1: module with results (interests + department populated) ----
await plantSession();
await page.setRequestInterception(true);
page.on('request', route);

// First real page load (fresh browser profile — no cache exists yet, so this
// is a genuine semantic-search network call).
results.push(await shot('module-mobile-360', { viewport: { width: 360, height: 800 }, hasInterests: true }));

// Same-session revisits: sessionStorage cache should suppress the network
// call entirely (verified below via the total call count).
results.push(await shot('module-mobile-360-light', { viewport: { width: 360, height: 800 }, hasInterests: true, light: true }));

// A second *independent* page load (cache wiped, simulating a separate
// browsing session for the same profile) — forces a real second network
// call so the two request bodies can be compared directly.
results.push(await shot('module-desktop', { viewport: { width: 1280, height: 900 }, hasInterests: true, freshCache: true }));
results.push(await shot('module-desktop-light', { viewport: { width: 1280, height: 900 }, hasInterests: true, light: true }));

// A third independent load, for good measure.
results.push(await shot('module-mobile-360-secondload', { viewport: { width: 360, height: 800 }, hasInterests: true, freshCache: true }));

// ---- Variant 2: prompt card (no department, no interests) ----
results.push(await shot('prompt-card-mobile-360', { viewport: { width: 360, height: 800 }, hasInterests: false }));
results.push(await shot('prompt-card-desktop', { viewport: { width: 1280, height: 900 }, hasInterests: false }));
results.push(await shot('prompt-card-mobile-360-light', { viewport: { width: 360, height: 800 }, hasInterests: false, light: true }));

await page.setRequestInterception(false);
page.off('request', route);

// ---- Variant 3: signed out (module entirely absent) ----
await clearSession();
await page.setRequestInterception(true);
page.on('request', route);
results.push(await shot('signed-out-mobile-360', { viewport: { width: 360, height: 800 }, hasInterests: true, signedIn: false }));
results.push(await shot('signed-out-desktop', { viewport: { width: 1280, height: 900 }, hasInterests: true, signedIn: false }));

fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, '_semantic-search-calls.json'), JSON.stringify(semanticSearchCalls, null, 2));

console.log('\n--- semantic-search request bodies (in call order) ---');
semanticSearchCalls.forEach((c, i) => console.log(`${i}: types=${JSON.stringify(c.types)} query=${JSON.stringify(c.query)}`));

const queries = semanticSearchCalls.map((c) => c.query);
console.log(`\nTotal semantic-search calls: ${semanticSearchCalls.length}`);
console.log(`Distinct query strings seen: ${JSON.stringify([...new Set(queries)])}`);

console.log(`\nScreenshots + report in ${OUT}/`);

await browser.close();
