import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8089';
const OUT = '.qa/event-notifications';
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

const MOCK_EVENTS = [
  {
    id: 888801,
    title: 'HackSRM 2026: Campus Innovation Sprint',
    description: 'Annual campus-wide hackathon bringing developers, designers, and innovators together for 36 hours of building solutions.',
    start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    venue: 'ALH 301, University Building',
    category: 'hackathon',
    registration_link: 'https://hacksrm.tech',
    is_featured: true,
    view_count: 240,
    created_at: new Date().toISOString(),
  },
  {
    id: 888802,
    title: 'Hands-on Deep Learning Workshop',
    description: 'Learn transformer architectures and deploy fine-tuned open-source models with GPU acceleration.',
    start_date: new Date(Date.now() + 3600000 * 3).toISOString(),
    end_date: new Date(Date.now() + 3600000 * 6).toISOString(),
    venue: 'UB 204 Computer Lab',
    category: 'workshop',
    registration_link: null,
    is_featured: false,
    view_count: 120,
    created_at: new Date().toISOString(),
  },
];

const MOCK_ATTENDEES = [
  {
    id: 'att-1',
    event_id: 888801,
    user_id: USER_ID,
    status: 'going',
    note: 'Working on multimodal vision assistant',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: USER_ID,
      name: 'Asha Kumar',
      email: 'fresher@test.local',
      avatar_url: null,
      department: 'Computer Science',
    },
  },
  {
    id: 'att-2',
    event_id: 888801,
    user_id: '00000000-0000-4000-8000-0000000000a1',
    status: 'interested',
    note: 'Looking for a frontend teammate',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'Rahul Verma',
      email: 'rahul@test.local',
      avatar_url: null,
      department: 'Computer Science',
    },
  },
];

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    user_id: USER_ID,
    type: 'event_alert',
    title: 'RSVP Confirmed: HackSRM 2026',
    content: "You're attending HackSRM 2026. We'll remind you 24 hours and 2 hours before the event starts.",
    link_url: '/events/888801',
    is_read: false,
    created_at: new Date(Date.now() - 600000).toISOString(),
    metadata: {
      event_id: 888801,
      event_title: 'HackSRM 2026: Campus Innovation Sprint',
      status: 'going',
    },
  },
  {
    id: 'notif-2',
    user_id: USER_ID,
    type: 'event_reminder',
    title: 'Starting Soon: Hands-on Deep Learning Workshop',
    content: 'Hands-on Deep Learning Workshop starts in less than 2 hours at UB 204 Computer Lab.',
    link_url: '/events/888802',
    is_read: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    metadata: {
      event_id: 888802,
      event_title: 'Hands-on Deep Learning Workshop',
      reminder_tier: 'starting_soon',
    },
  },
];

function respondJson(request, body, status = 200) {
  return request.respond({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Expose-Headers': 'content-range',
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

  if (url.includes('/auth/v1/user')) {
    return respondJson(request, FAKE_SESSION.user);
  }

  if (url.includes('/rest/v1/users')) {
    return respondJson(request, {
      id: USER_ID,
      name: 'Asha Kumar',
      email: 'fresher@test.local',
      role: 'student',
      is_admin: false,
      profile_image: null,
      verification_status: 'verified',
      has_seen_welcome_tour: true,
      department: 'Computer Science',
      skills: ['React', 'TypeScript'],
    });
  }

  if (url.includes('/rest/v1/srmap_events_cache')) {
    if (url.includes('id=eq.888801')) {
      return respondJson(request, MOCK_EVENTS[0]);
    }
    if (url.includes('id=eq.888802')) {
      return respondJson(request, MOCK_EVENTS[1]);
    }
    return respondJson(request, MOCK_EVENTS);
  }

  if (url.includes('/rest/v1/event_attendees')) {
    if (request.method() === 'POST') {
      return respondJson(request, MOCK_ATTENDEES[0]);
    }
    return respondJson(request, MOCK_ATTENDEES);
  }

  if (url.includes('/rest/v1/notifications')) {
    if (request.method() === 'POST') {
      return respondJson(request, MOCK_NOTIFICATIONS[0]);
    }
    return respondJson(request, MOCK_NOTIFICATIONS);
  }

  if (url.includes('/rpc/dispatch_upcoming_event_reminders')) {
    return respondJson(request, [
      {
        notification_id: 'rem-1',
        user_id: USER_ID,
        title: 'Starting Soon: Hands-on Deep Learning Workshop',
        content: 'Hands-on Deep Learning Workshop starts in less than 2 hours at UB 204 Computer Lab.',
        event_id: 888802,
        url: '/events/888802',
        reminder_tier: 'starting_soon',
      },
    ]);
  }

  if (url.includes('/rpc/')) {
    return respondJson(request, []);
  }

  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const scenarios = [
  { name: 'desktop-light', width: 1280, height: 900, dark: false },
  { name: 'desktop-dark', width: 1280, height: 900, dark: true },
  { name: 'mobile-light', width: 360, height: 800, dark: false },
  { name: 'mobile-dark', width: 360, height: 800, dark: true },
];

async function setupPage(s) {
  const page = await browser.newPage();
  await page.setViewport({ width: s.width, height: s.height });
  await page.setRequestInterception(true);
  page.on('request', route);

  await page.evaluateOnNewDocument(
    (key, session) => {
      try {
        localStorage.setItem(key, JSON.stringify(session));
        localStorage.setItem('has_seen_welcome_tour', 'true');
      } catch (e) {
        console.error('Failed to set localStorage', e);
      }
    },
    `sb-${PROJECT_REF}-auth-token`,
    FAKE_SESSION
  );

  return page;
}

try {
  // 1. Marketplace sweep with scroll to show cards
  for (const s of scenarios) {
    const page = await setupPage(s);
    await page.goto(`${BASE}/marketplace`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200));

    if (s.dark) {
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await new Promise((r) => setTimeout(r, 400));
    }

    // Capture top view
    const file = path.join(OUT, `marketplace-${s.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`Saved screenshot: ${file}`);

    // Scroll down to cards
    await page.evaluate(() => window.scrollBy(0, 450));
    await new Promise((r) => setTimeout(r, 600));
    const cardsFile = path.join(OUT, `marketplace-cards-${s.name}.png`);
    await page.screenshot({ path: cardsFile, fullPage: false });
    console.log(`Saved screenshot: ${cardsFile}`);

    // Open notifications bell popover
    try {
      const bellButton = await page.$('button:has(svg.lucide-bell), button[aria-label*="notification" i], .lucide-bell');
      if (bellButton) {
        await bellButton.click();
        await new Promise((r) => setTimeout(r, 800));
        const notifFile = path.join(OUT, `notifications-popover-${s.name}.png`);
        await page.screenshot({ path: notifFile, fullPage: false });
        console.log(`Saved screenshot: ${notifFile}`);
      }
    } catch (e) {
      console.log('Could not open bell popover:', e.message);
    }

    await page.close();
  }

  // 2. Event detail sweep (/events/888801)
  for (const s of scenarios) {
    const page = await setupPage(s);
    await page.goto(`${BASE}/events/888801`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200));

    if (s.dark) {
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await new Promise((r) => setTimeout(r, 400));
    }

    // Scroll down to roster and RSVP area
    await page.evaluate(() => window.scrollBy(0, 350));
    await new Promise((r) => setTimeout(r, 600));

    // Click "Going" button in roster
    try {
      const goingBtn = await page.$('button:has-text("Going"), button:has(.lucide-calendar-check)');
      if (goingBtn) {
        await goingBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch {}

    const file = path.join(OUT, `event-detail-rsvp-${s.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`Saved screenshot: ${file}`);
    await page.close();
  }

  console.log('All event notification screenshots captured successfully.');
} catch (err) {
  console.error('QA script error:', err);
  process.exit(1);
} finally {
  await browser.close();
}
