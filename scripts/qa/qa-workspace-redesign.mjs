import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = 'http://localhost:8081';
const OUT = '.qa-workspace-redesign';
fs.mkdirSync(OUT, { recursive: true });

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
    user_metadata: { full_name: 'Arjun Sharma' },
    created_at: new Date().toISOString(),
  },
};

const PROFILE_ROW = {
  id: USER_ID,
  name: 'Arjun Sharma',
  email: 'owner@test.local',
  role: 'student',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  has_seen_welcome_tour: true,
  theme: null,
};

const MOCK_COMMUNITIES = [
  {
    id: COMMUNITY_ID,
    slug: SLUG,
    name: 'SIH 2026 — Team Alpha',
    description: 'Building our full-stack entry for Smart India Hackathon. Looking for UI designers and backend devs.',
    kind: 'hackathon',
    cover_image: null,
    member_count: 5,
    post_count: 3,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    last_activity_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    owner_id: USER_ID,
    owner_name: 'Arjun Sharma',
    owner_image: null,
    viewer_is_member: true,
    viewer_is_owner: true,
    visibility: 'public',
    viewer_has_requested: false,
    viewer_has_invite: false,
    total_count: 4,
  },
  {
    id: '00000000-0000-4000-8000-0000000000c1',
    slug: 'robotics-club-srmap',
    name: 'Robotics & Automation Club',
    description: 'Autonomous drones, rover builds, ROS2 workshops, and competition prep for IIT techfests.',
    kind: 'club',
    cover_image: null,
    member_count: 42,
    post_count: 8,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    last_activity_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    owner_id: '00000000-0000-4000-8000-000000000002',
    owner_name: 'Rahul V',
    owner_image: null,
    viewer_is_member: true,
    viewer_is_owner: false,
    visibility: 'public',
    viewer_has_requested: false,
    viewer_has_invite: false,
    total_count: 4,
  },
  {
    id: '00000000-0000-4000-8000-0000000000c2',
    slug: 'dsa-placement-prep-2027',
    name: 'DSA & Interview Prep 2027',
    description: 'LeetCode daily challenges, Striver SDE sheet tracking, mock interviews, and system design discussions.',
    kind: 'study',
    cover_image: null,
    member_count: 68,
    post_count: 14,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    last_activity_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    owner_id: '00000000-0000-4000-8000-000000000003',
    owner_name: 'Priya K',
    owner_image: null,
    viewer_is_member: false,
    viewer_is_owner: false,
    visibility: 'public',
    viewer_has_requested: false,
    viewer_has_invite: false,
    total_count: 4,
  },
  {
    id: '00000000-0000-4000-8000-0000000000c3',
    slug: 'ml-reading-group',
    name: 'Machine Learning Reading Circle',
    description: 'Weekly deep dive into NeurIPS, ICML and CVPR papers. Hands-on PyTorch implementations.',
    kind: 'research',
    cover_image: null,
    member_count: 19,
    post_count: 5,
    is_archived: false,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    last_activity_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    owner_id: '00000000-0000-4000-8000-000000000004',
    owner_name: 'Dr. Suresh M',
    owner_image: null,
    viewer_is_member: false,
    viewer_is_owner: false,
    visibility: 'public',
    viewer_has_requested: false,
    viewer_has_invite: false,
    total_count: 4,
  }
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

async function run() {
  const base = BASE;
  console.log(`Connecting to ${base}...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const url = req.url();

    if (req.method() === 'OPTIONS') {
      return req.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Expose-Headers': 'content-range',
        },
      });
    }

    if (!url.includes('supabase.co')) return req.continue();

    if (url.includes('/auth/v1/user')) return respondJson(req, FAKE_SESSION.user);
    if (url.includes('/rest/v1/users')) return respondJson(req, PROFILE_ROW);
    if (url.includes('/rest/v1/mentors')) return respondJson(req, null);

    if (url.includes('/rpc/list_communities')) {
      return respondJson(req, MOCK_COMMUNITIES);
    }

    if (url.includes('/rpc/community_kind_counts')) {
      return respondJson(req, [
        { kind: 'hackathon', group_count: 1 },
        { kind: 'club', group_count: 1 },
        { kind: 'study', group_count: 1 },
        { kind: 'research', group_count: 1 },
      ]);
    }

    if (url.includes('/rpc/get_community')) {
      return respondJson(req, [MOCK_COMMUNITIES[0]]);
    }

    if (url.includes('/rpc/list_community_channels')) {
      return respondJson(req, []);
    }

    if (url.includes('/rpc/list_group_messages')) {
      return respondJson(req, [
        {
          id: 'msg-1',
          sender_id: USER_ID,
          sender_name: 'Arjun Sharma',
          sender_avatar: null,
          is_owner: true,
          is_mentor: false,
          channel: 'general',
          content: 'Hey everyone! Let us review the problem statements for SIH today.',
          reply_to_id: null,
          reply_to_sender_name: null,
          reply_to_content: null,
          reactions: { '🔥': 3, '🚀': 2 },
          viewer_reactions: ['🔥'],
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        }
      ]);
    }

    if (url.includes('/rest/v1/community_posts')) {
      return respondJson(req, []);
    }

    req.continue();
  });

  // 1. Test Returning User (Signed in, My Communities view)
  console.log('Testing My Communities View on Desktop...');
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument((token) => {
    localStorage.setItem('sb-ruapdkrgcbqrhvsayvpf-auth-token', JSON.stringify(token));
  }, FAKE_SESSION);

  await page.goto(`${base}/workspace-groups`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/01-my-communities-desktop.png`, fullPage: true });

  // 2. Test Mobile Viewport (390px iPhone/Android)
  console.log('Testing Mobile Viewport...');
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/02-my-communities-mobile.png`, fullPage: true });

  // 3. Test Discover View on Desktop in Grid Mode
  console.log('Testing Discover View in Grid Mode...');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}/workspace-groups?view=discover`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/03-discover-grid.png`, fullPage: true });

  // 4. Test Switching to Rows Mode
  console.log('Testing Switching to Rows Mode...');
  const rowsButton = await page.$('button[title="List / Rows view"]');
  if (rowsButton) {
    await rowsButton.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: `${OUT}/04-discover-rows.png`, fullPage: true });
    console.log('Switched to Rows mode successfully.');
  }

  // Switch back to Grid mode
  const gridButton = await page.$('button[title="Grid view"]');
  if (gridButton) {
    await gridButton.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // 5. Test Clicking on a Community Card in Grid mode
  console.log('Testing Card Clickability in Grid mode...');
  const firstCardLink = await page.$('article a[aria-label^="Open"]');
  if (firstCardLink) {
    console.log('Found card link, clicking it...');
    await firstCardLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const currentUrl = page.url();
    console.log(`Navigated to: ${currentUrl}`);
    await page.screenshot({ path: `${OUT}/05-after-card-click.png`, fullPage: true });
  }

  // 6. Test Workspace Resources Tab on Desktop
  console.log('Testing Workspace Resources Tab...');
  await page.goto(`${base}/workspace-groups/sih-team-alpha?tab=resources`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/06-workspace-resources-desktop.png`, fullPage: true });

  console.log('Visual QA completed successfully! Saved screenshots to .qa-workspace-redesign/');
  await browser.close();
}

run().catch((err) => {
  console.error('QA Error:', err);
  process.exit(1);
});
