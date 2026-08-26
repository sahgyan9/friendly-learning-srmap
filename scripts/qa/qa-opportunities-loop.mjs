// Growth-loop walkthrough for T3.1 (frontend half): opportunities list -> detail
// -> post a new opportunity -> form a team -> team page/chat entry.
//
// Same technique as qa-signed-in-sweep.mjs / qa-group-channels.mjs: a planted
// session in localStorage, request interception, and a controlled Supabase
// REST/RPC surface. No real backend involved. Also exercises the new share
// row on OpportunityDetail (WhatsApp href + copy-link clipboard write).
//
//   node qa-opportunities-loop.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:8083';
const OUT = '.qa-opportunities';
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_REF = 'ruapdkrgcbqrhvsayvpf';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const OPP_ID = '00000000-0000-4000-8000-0000000000o1';
const SLUG = 'smart-india-hackathon-2026';

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
  name: 'Asha Kumar',
  email: 'fresher@test.local',
  role: 'student',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  has_seen_welcome_tour: true,
  theme: null,
};

function freshOpportunity() {
  return {
    id: OPP_ID,
    slug: SLUG,
    title: 'Smart India Hackathon 2026',
    organiser: 'Ministry of Education, Govt of India',
    kind: 'hackathon',
    description: 'A national hackathon. Build a working prototype for one of the released problem statements.',
    tags: ['Machine Learning', 'Web Development', 'IoT'],
    location: null,
    is_online: true,
    starts_at: null,
    ends_at: null,
    register_by: new Date(Date.now() + 86400000 * 6).toISOString(),
    external_url: 'https://sih.gov.in',
    team_min: 2,
    team_max: 6,
    interest_count: 3,
    team_count: 0,
    posted_by: '00000000-0000-4000-8000-0000000000a9',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  };
}

// Mutable "server" state, updated as the walkthrough performs actions.
const STATE = {
  opportunities: [freshOpportunity()],
  teams: [], // opportunity_teams rows, joined shape
  interested: false,
  teamSeq: 0,
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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

const seenRequests = [];

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
  seenRequests.push(`${method} ${url.replace(/^https?:\/\/[^/]+/, '')}`);

  if (url.includes('/auth/v1/user')) return respondJson(request, FAKE_SESSION.user);
  if (url.includes('/rest/v1/users')) return respondJson(request, PROFILE_ROW);
  if (url.includes('/rest/v1/mentors')) return respondJson(request, null);

  // ---- opportunities ----
  if (url.includes('/rest/v1/opportunities') && !url.includes('opportunity_')) {
    if (method === 'POST') {
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch {}
      const slug = slugify(body.title || 'opportunity');
      const created = {
        ...freshOpportunity(),
        id: `00000000-0000-4000-8000-0000000000${(90 + STATE.opportunities.length).toString(16)}`,
        slug,
        title: body.title,
        organiser: body.organiser ?? null,
        kind: body.kind ?? 'hackathon',
        description: body.description ?? null,
        tags: body.tags ?? [],
        is_online: body.is_online ?? true,
        location: body.location ?? null,
        register_by: body.register_by ?? null,
        external_url: body.external_url ?? null,
        team_min: body.team_min ?? null,
        team_max: body.team_max ?? null,
        interest_count: 0,
        team_count: 0,
        posted_by: USER_ID,
        created_at: new Date().toISOString(),
      };
      STATE.opportunities.unshift(created);
      // createOpportunity() selects "slug, title" back.
      return respondJson(request, { slug: created.slug, title: created.title }, 201);
    }
    if (url.includes(`slug=eq.${SLUG}`) || url.includes('slug=eq.')) {
      // getOpportunityBySlug: .maybeSingle() — single object, not an array.
      const slugParam = decodeURIComponent(url.split('slug=eq.')[1].split('&')[0]);
      const found = STATE.opportunities.find((o) => o.slug === slugParam) ?? null;
      return respondJson(request, found);
    }
    // getOpportunities(): list.
    return respondJson(request, STATE.opportunities);
  }

  // ---- opportunity_interest ----
  if (url.includes('/rest/v1/opportunity_interest')) {
    if (method === 'DELETE') {
      STATE.interested = false;
      return respondJson(request, []);
    }
    if (method === 'POST') {
      STATE.interested = true;
      return respondJson(request, [{ opportunity_id: OPP_ID, user_id: USER_ID, note: null }]);
    }
    // getMyInterest(): .maybeSingle()
    return respondJson(request, STATE.interested ? { note: null, created_at: new Date().toISOString() } : null);
  }

  // ---- opportunity_teams ----
  if (url.includes('/rest/v1/opportunity_teams')) {
    if (method === 'POST') {
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch {}
      // The linked community was just created in the prior POST — read it
      // back from STATE.teams' pending marker set by the communities handler.
      const community = STATE.pendingCommunity;
      STATE.teamSeq += 1;
      const team = {
        id: `team-${STATE.teamSeq}`,
        opportunity_id: body.opportunity_id,
        community_id: body.community_id,
        looking_for: body.looking_for ?? [],
        pitch: body.pitch ?? null,
        is_open: true,
        created_by: USER_ID,
        community: community
          ? { slug: community.slug, name: community.name, description: community.description ?? '', member_count: 1 }
          : null,
      };
      STATE.teams.push(team);
      const opp = STATE.opportunities.find((o) => o.id === body.opportunity_id);
      if (opp) opp.team_count += 1;
      return respondJson(request, [team], 201);
    }
    // getTeams(): array, joined community.
    return respondJson(request, STATE.teams);
  }

  // ---- communities (team creation, step 1) ----
  if (url.includes('/rest/v1/communities')) {
    if (method === 'POST') {
      let body = {};
      try {
        body = JSON.parse(request.postData() || '{}');
      } catch {}
      const slug = slugify(body.name || 'team');
      const community = { id: `community-${slug}`, slug, name: body.name, description: body.description };
      STATE.pendingCommunity = community;
      // createTeam() selects "id, slug, name" back via .single().
      return respondJson(request, { id: community.id, slug: community.slug, name: community.name }, 201);
    }
    return respondJson(request, []);
  }

  // ---- RPCs (community workspace, once "Open chat" is followed) ----
  if (url.includes('/rpc/')) {
    const name = url.split('/rpc/')[1].split('?')[0];
    seenRequests.push(`RPC ${name}`);

    if (name === 'get_community') {
      const community = STATE.pendingCommunity;
      if (!community) return respondJson(request, []);
      return respondJson(request, [
        {
          id: community.id,
          slug: community.slug,
          name: community.name,
          description: community.description || `Team for ${STATE.opportunities[0].title}`,
          kind: 'hackathon',
          cover_image: null,
          member_count: 1,
          post_count: 0,
          is_archived: false,
          created_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          owner_id: USER_ID,
          owner_name: 'Asha Kumar',
          owner_image: null,
          owner_is_mentor: false,
          viewer_is_member: true,
          viewer_is_owner: true,
          viewer_can_post: true,
          visibility: 'private',
          viewer_has_requested: false,
          viewer_has_invite: false,
          viewer_can_view: true,
          pending_request_count: 0,
        },
      ]);
    }
    if (name === 'list_community_channels') return respondJson(request, []);
    if (name === 'list_group_messages') return respondJson(request, []);
    if (name === 'get_community_members') {
      return respondJson(request, [
        { user_id: USER_ID, name: 'Asha Kumar', profile_image: null, role: 'owner', is_mentor: false, joined_at: new Date().toISOString() },
      ]);
    }
    if (name === 'is_admin_user') return respondJson(request, false);

    return respondJson(request, null);
  }

  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const findings = [];
let errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

// Intercept clipboard writes so we can assert what copy-link actually wrote,
// without a real OS clipboard in headless Chrome.
await page.evaluateOnNewDocument(() => {
  window.__clipboard = null;
  const originalWrite = navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText.bind(navigator.clipboard)
    : null;
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: (text) => {
        window.__clipboard = text;
        return Promise.resolve();
      },
    },
    configurable: true,
  });
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

async function setViewport(mobile) {
  await page.setViewport(mobile ? { width: 360, height: 900 } : { width: 1280, height: 900 });
}

async function setLightTheme(light) {
  await page.evaluate((l) => {
    try {
      localStorage.setItem('theme', l ? 'light' : 'dark');
    } catch {}
  }, light);
}

function record(step, detail) {
  findings.push({ step, detail });
  console.log(`- ${step}: ${detail}`);
}

// ---------------------------------------------------------------------------
// Step 1: /opportunities list — mobile then desktop.
// ---------------------------------------------------------------------------
console.log('\n== Step 1: /opportunities list ==');
await setViewport(true);
errors = [];
await page.goto(`${BASE}/opportunities`, { waitUntil: 'networkidle2', timeout: 45000 });
await wait(1200);
await page.screenshot({ path: `${OUT}/1-list-mobile.png`, fullPage: true });
record('list-mobile', `errors=${errors.length}`);

await setViewport(false);
await wait(400);
await page.screenshot({ path: `${OUT}/1-list-desktop.png`, fullPage: true });
record('list-desktop', `errors=${errors.length}`);

// ---------------------------------------------------------------------------
// Step 2: open detail via the card link.
// ---------------------------------------------------------------------------
console.log('\n== Step 2: opportunity detail ==');
const clicked = await page.evaluate(() => {
  const link = document.querySelector('a[href^="/opportunities/"]');
  if (!link) return false;
  link.click();
  return true;
});
record('detail-nav-via-card-link', String(clicked));
await wait(1500);
const detailUrl = page.url();
record('detail-url', detailUrl);

await page.screenshot({ path: `${OUT}/2-detail-desktop.png`, fullPage: true });

// Share row: verify buttons exist and read the WhatsApp href.
const shareInfo = await page.evaluate(() => {
  const waLink = document.querySelector('a[aria-label="Share on WhatsApp"]');
  const copyBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Copy link');
  return {
    waHref: waLink ? waLink.getAttribute('href') : null,
    hasCopyButton: Boolean(copyBtn),
  };
});
record('whatsapp-href', shareInfo.waHref ?? '(missing)');
record('copy-button-present', String(shareInfo.hasCopyButton));

// Click copy-link, then read back what was written + toast + label swap.
await page.evaluate(() => {
  const copyBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Copy link');
  copyBtn?.click();
});
await wait(500);
const clipboardWritten = await page.evaluate(() => window.__clipboard);
const copiedLabel = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Copied'));
  return Boolean(btn);
});
const toastVisible = await page.evaluate(() => document.body.innerText.includes('Copied'));
record('clipboard-written', clipboardWritten ?? '(nothing written)');
record('copied-label-shown', String(copiedLabel));
record('copied-toast-shown', String(toastVisible));
await page.screenshot({ path: `${OUT}/2b-detail-copied-state.png` });

// Mobile + light theme pass over the share row.
await setViewport(true);
await wait(400);
await page.screenshot({ path: `${OUT}/2c-detail-mobile-dark.png`, fullPage: true });
await setLightTheme(true);
await page.reload({ waitUntil: 'networkidle2' });
await wait(1200);
await page.screenshot({ path: `${OUT}/2d-detail-mobile-light.png`, fullPage: true });
await setViewport(false);
await wait(400);
await page.screenshot({ path: `${OUT}/2e-detail-desktop-light.png`, fullPage: true });
await setLightTheme(false);
await page.reload({ waitUntil: 'networkidle2' });
await wait(1200);

// ---------------------------------------------------------------------------
// Step 3: post a new opportunity from the list page.
// ---------------------------------------------------------------------------
console.log('\n== Step 3: post an opportunity ==');
await page.goto(`${BASE}/opportunities`, { waitUntil: 'networkidle2', timeout: 45000 });
await wait(1000);
const openedPostDialog = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Post an opportunity'));
  if (!btn) return false;
  btn.click();
  return true;
});
record('post-dialog-opened', String(openedPostDialog));
await wait(600);
await page.screenshot({ path: `${OUT}/3a-post-dialog-empty.png` });

const setInput = async (id, value) => {
  await page.evaluate(
    (elId, val) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value',
      ).set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    id,
    value,
  );
};

await setInput('opportunity-title', 'Winter of Code 2026');
await setInput('opportunity-organiser', 'Open Source Club');
await setInput('opportunity-description', 'Contribute to real open-source projects over winter break.');
await setInput('opportunity-tags', 'Open Source, Git, Python');
await setInput('opportunity-deadline', '2026-09-15');
await setInput('opportunity-url', 'https://woc.example.org');
await wait(300);
await page.screenshot({ path: `${OUT}/3b-post-dialog-filled.png` });

const submitted = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Post it');
  if (!btn || btn.disabled) return false;
  btn.click();
  return true;
});
record('post-submit-clicked', String(submitted));
await wait(1200);
const postToast = await page.evaluate(() => document.body.innerText.includes('Posted') || document.body.innerText.includes('is live'));
record('post-success-toast', String(postToast));
const dialogClosedAfterPost = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
record('post-dialog-closed-after-submit', String(dialogClosedAfterPost));
await page.screenshot({ path: `${OUT}/3c-post-after-submit.png`, fullPage: true });

// ---------------------------------------------------------------------------
// Step 4: form a team on the original opportunity's detail page.
// ---------------------------------------------------------------------------
console.log('\n== Step 4: form a team ==');
await page.goto(`${BASE}/opportunities/${SLUG}`, { waitUntil: 'networkidle2', timeout: 45000 });
await wait(1200);
const startTeamClicked = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Start a team'));
  if (!btn) return false;
  btn.click();
  return true;
});
record('start-team-dialog-opened', String(startTeamClicked));
await wait(600);
await page.screenshot({ path: `${OUT}/4a-team-dialog-empty.png` });

await setInput('team-name', 'Night Shift');
await setInput('team-pitch', 'A vision model that maps step-free routes around campus for the accessibility track.');
await setInput('team-needs', 'UI/UX, Frontend, Pitching');
await wait(300);
await page.screenshot({ path: `${OUT}/4b-team-dialog-filled.png` });

const teamSubmitted = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Create team');
  if (!btn || btn.disabled) return false;
  btn.click();
  return true;
});
record('team-submit-clicked', String(teamSubmitted));
await wait(1200);
const teamToast = await page.evaluate(() => document.body.innerText.includes('Team created'));
record('team-success-toast', String(teamToast));
await page.screenshot({ path: `${OUT}/4c-team-after-submit.png`, fullPage: true });

// ---------------------------------------------------------------------------
// Step 5: follow "Open chat" into the team's community page.
// ---------------------------------------------------------------------------
console.log('\n== Step 5: team page / chat entry ==');
const chatLinkHref = await page.evaluate(() => {
  const link = Array.from(document.querySelectorAll('a')).find((a) => a.textContent.includes('Open chat'));
  return link ? link.getAttribute('href') : null;
});
record('open-chat-link-href', chatLinkHref ?? '(missing)');

if (chatLinkHref) {
  errors = [];
  await page.goto(`${BASE}${chatLinkHref}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await wait(1500);
  await page.screenshot({ path: `${OUT}/5-team-chat-page.png`, fullPage: true });
  record('team-chat-page-errors', `errors=${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
} else {
  record('team-chat-page', 'SKIPPED — no "Open chat" link found after team creation');
}

// ---------------------------------------------------------------------------
fs.writeFileSync(`${OUT}/_findings.json`, JSON.stringify(findings, null, 2));
fs.writeFileSync(`${OUT}/_requests-seen.json`, JSON.stringify(seenRequests, null, 2));

console.log(`\nDone. Screenshots + findings in ${OUT}/`);
await browser.close();
