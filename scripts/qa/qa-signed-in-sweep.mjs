// Visual QA sweep for T1.1 part 2 (signed-in states): the 13 protected/admin
// routes plus signed-in variants of the main public pages. Same technique as
// qa-welcome-tour.mjs / qa-group-channels.mjs: a planted session in
// localStorage, request interception, and a controlled Supabase REST/RPC
// surface — no real backend involved.
//
//   node qa-signed-in-sweep.mjs [baseUrl] [outDir]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8083';
const OUT = process.argv[3] || '.qa-sweep';
fs.mkdirSync(OUT, { recursive: true });

const PROJECT_REF = 'ruapdkrgcbqrhvsayvpf';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const MENTOR_A = '00000000-0000-4000-8000-0000000000a1';
const MENTOR_B = '00000000-0000-4000-8000-0000000000a2';
const OTHER_USER = '00000000-0000-4000-8000-0000000000a3';

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

// Mutable scenario the route() handler reads on every request. Changed
// between page loads within the same browser session.
const SCENARIO = {
  isAdmin: false,
  populated: true,
  isMentor: false,
  // When true, the caller's own mentor_verifications row (matched by
  // user_id=eq.<USER_ID>) is 'approved' rather than the default 'pending' —
  // needed to see the real /become-mentor/success page instead of its
  // redirect-back-to-/become-mentor guard.
  ownApplicationApproved: false,
};

function profileRow() {
  return {
    id: USER_ID,
    name: SCENARIO.isAdmin ? 'Admin Priya' : 'Asha Kumar',
    email: 'fresher@test.local',
    role: SCENARIO.isMentor ? 'mentor' : 'student',
    is_admin: SCENARIO.isAdmin,
    profile_image: null,
    verification_status: 'verified',
    has_seen_welcome_tour: true,
    theme: null,
    mobile: null,
    department: SCENARIO.isMentor ? 'Computer Science' : null,
    skills: SCENARIO.isMentor ? ['React', 'DSA'] : [],
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

// ---------------------------------------------------------------------------
// Fixtures. Each function reads SCENARIO.populated to decide rich vs. empty.
// ---------------------------------------------------------------------------

function mentorVerificationRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      id: 'v-1',
      user_id: MENTOR_A,
      status: 'pending',
      cgpa: 8.7,
      college_id: 'AP21110010123',
      graduation_year: 2027,
      hobbies: 'Chess, reading',
      university: 'SRM University AP',
      year_of_studies: '3rd Year',
      application_data: { name: 'Rahul Verma', department: 'Computer Science', skills: 'React, Node', bio: 'CS junior who loves building things.', linkedin_url: '', mobile: '9999999999', profile_image: null },
      submitted_at: new Date(Date.now() - 86400000).toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      flags: [],
      user: { name: 'Rahul Verma', email: 'rahul@test.local', department: 'Computer Science' },
      reviewed_by_user: null,
    },
    {
      id: 'v-2',
      user_id: MENTOR_B,
      status: 'approved',
      cgpa: 9.1,
      college_id: 'AP21110010456',
      graduation_year: 2026,
      hobbies: 'Basketball',
      university: 'SRM University AP',
      year_of_studies: '4th Year',
      application_data: { name: 'Sneha Rao', department: 'Electronics', skills: 'Circuits, MATLAB', bio: 'Loves teaching.', linkedin_url: '', mobile: '8888888888', profile_image: null },
      submitted_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      reviewed_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      reviewed_by: USER_ID,
      rejection_reason: null,
      flags: ['duplicate_college_id'],
      user: { name: 'Sneha Rao', email: 'sneha@test.local', department: 'Electronics' },
      reviewed_by_user: { name: 'Admin Priya', email: 'admin@test.local' },
    },
    {
      id: 'v-3',
      user_id: OTHER_USER,
      status: 'rejected',
      cgpa: 6.2,
      college_id: 'AP21110010789',
      graduation_year: 2028,
      hobbies: null,
      university: 'SRM University AP',
      year_of_studies: '2nd Year',
      application_data: { name: 'Karan Singh', department: 'Mechanical', skills: 'CAD', bio: '', linkedin_url: '', mobile: '', profile_image: null },
      submitted_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      reviewed_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      reviewed_by: USER_ID,
      rejection_reason: 'Bio was empty, please add more detail.',
      flags: [],
      user: { name: 'Karan Singh', email: 'karan@test.local', department: 'Mechanical' },
      reviewed_by_user: { name: 'Admin Priya', email: 'admin@test.local' },
    },
  ];
}

function welcomeStatusRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      user_id: MENTOR_B,
      name: 'Sneha Rao',
      email: 'sneha@test.local',
      profile_image: null,
      department: 'Electronics',
      approved_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      sent_at: null,
      welcomed: false,
    },
    {
      user_id: OTHER_USER,
      name: 'Prior Mentor',
      email: 'prior@test.local',
      profile_image: null,
      department: 'Physics',
      approved_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      sent_at: new Date(Date.now() - 86400000 * 29).toISOString(),
      welcomed: true,
    },
  ];
}

function contactMessageRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      id: 'cm-1',
      name: 'Divya Patel',
      email: 'divya@test.local',
      subject: 'Cannot upload profile picture',
      message: 'I keep getting an error when I try to crop my photo.',
      status: 'unread',
      admin_notes: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'cm-2',
      name: 'Arjun Mehta',
      email: 'arjun@test.local',
      subject: 'Question about mentor application',
      message: 'How long does review usually take?',
      status: 'responded',
      admin_notes: 'Told him 3-5 days.',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}

function marketplacePostRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      id: 'mp-1',
      title: 'Hackathon 2026 Registrations Open',
      description: 'Sign up before Friday.',
      category: 'events',
      date: new Date().toISOString(),
      author: 'Student Council',
      image_url: null,
      external_link: null,
      user_id: USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

function teamMemberRows() {
  if (!SCENARIO.populated) return [];
  return [
    { id: 'tm-1', name: 'Gyan S', position: 'Founder', email: 'gyan@test.local', image_url: null, created_at: new Date().toISOString() },
  ];
}

function adminUserRows() {
  if (!SCENARIO.populated) return [];
  return [{ id: USER_ID, name: 'Admin Priya', email: 'admin@test.local', profile_image: null }];
}

function conversationRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      id: 'conv-1',
      user1_id: USER_ID,
      user2_id: MENTOR_A,
      last_message_id: 'm-1',
      last_updated: new Date(Date.now() - 600000).toISOString(),
    },
  ];
}

function messageRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      id: 'm-1',
      conversation_id: 'conv-1',
      content: 'Hey! Are you free for a quick call this week?',
      sent_at: new Date(Date.now() - 600000).toISOString(),
      sender_id: MENTOR_A,
      receiver_id: USER_ID,
      is_read: false,
    },
  ];
}

function mentorListRows() {
  if (!SCENARIO.populated) return [];
  return [
    {
      id: MENTOR_A,
      name: 'Rahul Verma',
      department: 'Computer Science',
      skills: ['React', 'Node'],
      rating: 4.7,
      profile_image: null,
      linkedin_url: null,
      bio: 'Happy to help with DSA and web dev.',
      review_count: 12,
      created_at: new Date().toISOString(),
      year_of_studies: '3rd Year',
      university: 'SRM University AP',
      hobbies: 'Chess',
      graduation_year: 2027,
      is_alumni: false,
      company: null,
      job_title: null,
      is_available: true,
      available_from: null,
      availability_note: null,
      projects: [],
      experiences: [],
      courses: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const seenUrls = new Set();

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
  seenUrls.add(url.replace(/^https?:\/\/[^/]+/, ''));

  if (url.includes('/auth/v1/user')) return respondJson(request, FAKE_SESSION.user);

  // ---- users table ----
  if (url.includes('/rest/v1/users')) {
    if (url.includes('is_admin=eq.true')) return respondJson(request, adminUserRows());
    if (url.includes('email=eq.') || url.includes('or=(email')) {
      // Admin user search: only return a hit if the query looks like our
      // planted mentor's email, otherwise "no results" is the honest answer.
      if (SCENARIO.populated && url.includes('sneha')) {
        return respondJson(request, [
          { id: MENTOR_B, name: 'Sneha Rao', email: 'sneha@test.local', role: 'mentor', profile_image: null, is_admin: false, department: 'Electronics' },
        ]);
      }
      return respondJson(request, []);
    }
    if (url.includes('role=in.') ) return respondJson(request, SCENARIO.populated ? [profileRow()] : []);
    if (url.includes('id=in.')) return respondJson(request, [profileRow()]);
    // Bare id=eq (self profile) or single-row updates/selects.
    return respondJson(request, profileRow());
  }

  // ---- mentors table ----
  if (url.includes('/rest/v1/mentors')) {
    if (url.includes('id=in.') || url.includes('in.(')) return respondJson(request, SCENARIO.populated ? mentorListRows() : []);
    if (url.includes('id=eq.' + USER_ID)) {
      return respondJson(request, SCENARIO.isMentor ? mentorListRows()[0] ?? null : null);
    }
    // Directory listing (Mentors page) or any other filtered select.
    return respondJson(request, SCENARIO.populated ? mentorListRows() : []);
  }

  if (url.includes('/rest/v1/mentor_verifications')) {
    if (url.includes('user_id=eq.')) {
      if (SCENARIO.ownApplicationApproved) {
        return respondJson(request, {
          id: 'v-own',
          user_id: USER_ID,
          status: 'approved',
          cgpa: 8.9,
          college_id: 'AP21110099999',
          graduation_year: 2027,
          hobbies: 'Music',
          university: 'SRM University AP',
          year_of_studies: '3rd Year',
          application_data: { name: 'Asha Kumar', department: 'Computer Science', skills: 'React', bio: '', linkedin_url: '', mobile: '', profile_image: null },
          submitted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          reviewed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          reviewed_by: USER_ID,
          rejection_reason: null,
          flags: [],
        });
      }
      const rows = mentorVerificationRows();
      return respondJson(request, rows[0] ?? null);
    }
    return respondJson(request, mentorVerificationRows());
  }

  if (url.includes('/rest/v1/mentor_reviews')) return respondJson(request, []);
  if (url.includes('/rest/v1/contact_messages')) return respondJson(request, contactMessageRows());
  if (url.includes('/rest/v1/marketplace_posts')) return respondJson(request, marketplacePostRows());
  if (url.includes('/rest/v1/team_members')) return respondJson(request, teamMemberRows());
  if (url.includes('/rest/v1/user_badges')) {
    if (!SCENARIO.populated) return respondJson(request, []);
    return respondJson(request, [
      { id: 'ub-1', user_id: USER_ID, badge_type_id: 'bt-1', awarded_at: new Date().toISOString(), badge_type: { id: 'bt-1', name: 'First Connection', category: 'contribution', icon: '🤝', description: 'Made your first connection' }, awarder: { name: 'System' } },
      { id: 'ub-2', user_id: USER_ID, badge_type_id: 'bt-2', awarded_at: new Date().toISOString(), badge_type: { id: 'bt-2', name: 'Top Rated', category: 'performance', icon: '⭐', description: 'Rated highly' }, awarder: { name: 'System' } },
    ]);
  }
  if (url.includes('/rest/v1/badge_types')) {
    if (!SCENARIO.populated) return respondJson(request, []);
    // icon is rendered verbatim as text (BadgeTypeList/BadgeCard both do
    // `{badge.icon}` directly) — the real column holds an emoji glyph, not an
    // icon-library name, so the fixture has to match that shape.
    return respondJson(request, [
      { id: 'bt-1', name: 'First Connection', category: 'contribution', icon: '🤝', description: 'Made your first connection', criteria: null, created_at: new Date().toISOString() },
      { id: 'bt-2', name: 'Top Rated', category: 'performance', icon: '⭐', description: 'Rated highly', criteria: null, created_at: new Date().toISOString() },
    ]);
  }
  if (url.includes('/rest/v1/messages')) return respondJson(request, messageRows());
  if (url.includes('/rest/v1/conversations')) return respondJson(request, conversationRows());
  if (url.includes('/rest/v1/admin_recovery')) return respondJson(request, []);
  if (url.includes('/rest/v1/admin_audit_log')) return respondJson(request, []);
  if (url.includes('/rest/v1/notifications')) return respondJson(request, []);
  if (url.includes('/rest/v1/faculty')) return respondJson(request, SCENARIO.populated ? [{ id: 'f-1', name: 'Dr. Test Faculty', department: 'CSE', is_active: true }] : []);
  if (url.includes('/rest/v1/opportunities')) return respondJson(request, []);
  if (url.includes('/rest/v1/communities')) return respondJson(request, []);
  if (url.includes('/rest/v1/community_posts')) return respondJson(request, []);

  // ---- RPCs ----
  if (url.includes('/rpc/')) {
    const name = url.split('/rpc/')[1].split('?')[0];

    if (name === 'is_admin_user') return respondJson(request, SCENARIO.isAdmin);
    if (name === 'get_team_members_public') return respondJson(request, teamMemberRows());
    if (name === 'admin_list_mentor_welcome_status') {
      return respondJson(
        request,
        welcomeStatusRows().map((r) => ({
          user_id: r.user_id,
          name: r.name,
          email: r.email,
          profile_image: r.profile_image,
          department: r.department,
          approved_at: r.approved_at,
          sent_at: r.sent_at,
          welcomed: r.welcomed,
        })),
      );
    }
    if (name === 'get_faculty_directory_stats') {
      return respondJson(request, SCENARIO.populated ? [{ faculty_count: 12, rating_count: 40, department_count: 6 }] : []);
    }
    if (name === 'get_top_rated_faculty') return respondJson(request, []);
    if (name === 'get_faculty_interest_facets') return respondJson(request, []);
    if (name === 'list_communities') return respondJson(request, []);
    if (name === 'get_community_feed') return respondJson(request, []);
    if (name === 'chat_participant_profiles') {
      return respondJson(request, SCENARIO.populated ? [{ id: MENTOR_A, name: 'Rahul Verma', profile_image: null, role: 'mentor' }] : []);
    }
    if (name === 'get_conversation_messages') return respondJson(request, messageRows());
    if (name === 'can_user_rate_mentor') return respondJson(request, false);
    if (name === 'get_mentor_reviews') return respondJson(request, []);
    if (name === 'my_certificate_status') return respondJson(request, { earned: false, exchanges: 0 });
    if (name === 'is_college_id_taken') return respondJson(request, false);

    // Mutations / side-effect RPCs: acknowledge harmlessly.
    return respondJson(request, null);
  }

  // Everything else Supabase-related: empty result. Irrelevant sections show
  // their own empty state instead of crashing.
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
await page.setViewport({ width: 1280, height: 900 });

let errors = [];
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

async function setLightTheme(light) {
  await page.evaluate((l) => {
    try {
      localStorage.setItem('theme', l ? 'light' : 'dark');
    } catch {}
  }, light);
}

async function shot(routePath, opts) {
  const {
    name,
    admin = false,
    populated = true,
    isMentor = false,
    approved = false,
    viewport = { width: 360, height: 800 },
    light = false,
    waitMs = 1500,
    fullPage = true,
  } = opts;

  SCENARIO.isAdmin = admin;
  SCENARIO.populated = populated;
  SCENARIO.isMentor = isMentor;
  SCENARIO.ownApplicationApproved = approved;

  await setLightTheme(light);
  await page.setViewport(viewport);
  errors = [];

  await page.goto(`${BASE}${routePath}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await wait(waitMs);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
  const hasSpinner = await page.evaluate(() => Boolean(document.querySelector('.animate-spin')));

  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });

  const report = { name, routePath, overflow, hasSpinner, errors: [...errors] };
  console.log(
    `${name.padEnd(42)} overflow=${String(overflow).padEnd(5)} spinner=${String(hasSpinner).padEnd(5)} errors=${errors.length}`,
  );
  if (errors.length) console.log('   ' + errors.slice(0, 5).join('\n   '));
  return report;
}

const results = [];

// ---- 13 protected/admin routes: populated + empty, mobile 360 ----
const adminRoutes = [
  { path: '/profile', key: 'profile' },
  { path: '/become-mentor', key: 'become-mentor' },
  { path: '/become-mentor/success', key: 'become-mentor-success' },
  { path: '/messages', key: 'messages' },
  { path: '/admin', key: 'admin-dashboard', admin: true },
  { path: '/admin/contact-messages', key: 'admin-contact-messages', admin: true },
  { path: '/admin/mentor-verification', key: 'admin-mentor-verification', admin: true },
  { path: '/admin/welcome-emails', key: 'admin-welcome-emails', admin: true },
  { path: '/admin/badges', key: 'admin-badges', admin: true },
  { path: '/admin/settings', key: 'admin-settings', admin: true },
  { path: '/admin/security', key: 'admin-security', admin: true },
  { path: '/admin/team-members', key: 'admin-team-members', admin: true },
  { path: '/admin/events', key: 'admin-events', admin: true },
];

for (const r of adminRoutes) {
  const approved = r.key === 'become-mentor-success';
  results.push(await shot(r.path, { name: `${r.key}-populated-mobile`, admin: !!r.admin, populated: true, approved, viewport: { width: 360, height: 900 } }));
  results.push(await shot(r.path, { name: `${r.key}-populated-desktop`, admin: !!r.admin, populated: true, approved, viewport: { width: 1280, height: 900 } }));
  results.push(await shot(r.path, { name: `${r.key}-empty-mobile`, admin: !!r.admin, populated: false, approved, viewport: { width: 360, height: 900 } }));
  results.push(await shot(r.path, { name: `${r.key}-populated-light-mobile`, admin: !!r.admin, populated: true, approved, viewport: { width: 360, height: 900 }, light: true }));
}

// ---- signed-in public pages ----
const publicRoutes = [
  { path: '/', key: 'home' },
  { path: '/mentors', key: 'mentors' },
  { path: '/faculty', key: 'faculty' },
  { path: '/communities', key: 'communities' },
  { path: '/opportunities', key: 'opportunities' },
  { path: '/community-posts', key: 'community-posts' },
  { path: '/marketplace', key: 'marketplace' },
];

for (const r of publicRoutes) {
  results.push(await shot(r.path, { name: `${r.key}-signedin-mobile`, populated: true, viewport: { width: 360, height: 900 } }));
}
results.push(await shot('/', { name: 'home-signedin-desktop', populated: true, viewport: { width: 1280, height: 900 } }));

fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(OUT, '_urls-seen.json'), JSON.stringify([...seenUrls].sort(), null, 2));

console.log(`\nScreenshots + report in ${OUT}/`);

await browser.close();
