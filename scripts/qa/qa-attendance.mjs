// Visual QA for redesigned Attendance page and Profile widget with stubbed Supabase responses.
//
//   node scripts/qa/qa-attendance.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5179';
const OUT = '.qa-attendance';
fs.mkdirSync(OUT, { recursive: true });

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
    email: 'student@test.local',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const MOCK_ATTENDANCE = [
  {
    id: 'att-1',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    course_code: 'CSE 301',
    course_name: 'Design and Analysis of Algorithms',
    slot: 'A1+A2',
    faculty_name: 'Dr. Ramesh Kumar',
    conducted_hours: 32,
    attended_hours: 28,
    absent_hours: 4,
    attendance_percentage: 87.5,
    classes_needed: 0,
    safe_bunks: 5,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'att-2',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    course_code: 'CSE 304',
    course_name: 'Database Management Systems',
    slot: 'B1+B2',
    faculty_name: 'Dr. Priya Sharma',
    conducted_hours: 30,
    attended_hours: 22,
    absent_hours: 8,
    attendance_percentage: 73.33,
    classes_needed: 2,
    safe_bunks: 0,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'att-3',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    course_code: 'ECE 205',
    course_name: 'Digital Logic and Microprocessors',
    slot: 'C1',
    faculty_name: 'Dr. Suresh Reddy',
    conducted_hours: 28,
    attended_hours: 22,
    absent_hours: 6,
    attendance_percentage: 78.57,
    classes_needed: 0,
    safe_bunks: 1,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'att-4',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    course_code: 'MAT 202',
    course_name: 'Probability and Statistics',
    slot: 'D1+D2',
    faculty_name: 'Dr. Joy Gorai',
    conducted_hours: 34,
    attended_hours: 32,
    absent_hours: 2,
    attendance_percentage: 94.12,
    classes_needed: 0,
    safe_bunks: 8,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'att-5',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    course_code: 'CSE 308',
    course_name: 'Operating Systems Laboratory',
    slot: 'P1+P2',
    faculty_name: 'Dr. Ananya Roy',
    conducted_hours: 16,
    attended_hours: 15,
    absent_hours: 1,
    attendance_percentage: 93.75,
    classes_needed: 0,
    safe_bunks: 3,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'att-6',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    course_code: 'ENG 101',
    course_name: 'Professional Communication',
    slot: 'E1',
    faculty_name: 'Dr. Nalini Iyer',
    conducted_hours: 20,
    attended_hours: 14,
    absent_hours: 6,
    attendance_percentage: 70.0,
    classes_needed: 4,
    safe_bunks: 0,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
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

function profileRow() {
  return {
    id: USER_ID,
    name: 'Asha Kumar',
    email: 'student@test.local',
    role: 'student',
    is_admin: false,
    profile_image: null,
    verification_status: 'verified',
    has_seen_welcome_tour: true,
    department: 'Computer Science',
    skills: ['DSA', 'Web Dev'],
    is_available: true,
  };
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function setupPage(page, theme = 'light') {
  await page.evaluateOnNewDocument((session, themeMode) => {
    localStorage.setItem('sb-ruapdkrgcbqrhvsayvpf-auth-token', JSON.stringify(session));
    localStorage.setItem('theme', themeMode);
  }, FAKE_SESSION, theme);

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
        },
      });
    }

    if (url.includes('/auth/v1/user')) {
      return respondJson(req, FAKE_SESSION.user);
    }

    if (url.includes('/rest/v1/student_attendance')) {
      return respondJson(req, MOCK_ATTENDANCE);
    }

    if (url.includes('/rest/v1/users')) {
      return respondJson(req, profileRow());
    }

    if (url.includes('/rest/v1/mentors')) {
      return respondJson(req, null);
    }

    if (url.includes('/rest/v1/notifications')) {
      return respondJson(req, []);
    }

    if (url.includes('/rpc/')) {
      return respondJson(req, null);
    }

    if (url.includes('supabase.co')) {
      return respondJson(req, []);
    }

    req.continue();
  });
}

try {
  console.log('Running Attendance UI QA with full auth stubs...');

  // 1. Desktop Attendance Page (Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/attendance`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'attendance-desktop-light.png'), fullPage: true });
    console.log('✓ attendance-desktop-light.png');
    await page.close();
  }

  // 2. Desktop Attendance Page (Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/attendance`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'attendance-desktop-dark.png'), fullPage: true });
    console.log('✓ attendance-desktop-dark.png');
    await page.close();
  }

  // 3. Mobile Attendance Page (390px)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/attendance`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'attendance-mobile-light.png'), fullPage: true });
    console.log('✓ attendance-mobile-light.png');
    await page.close();
  }

  // 4. Desktop Profile Page with AttendanceOverviewCard (Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'profile-attendance-desktop-light.png'), fullPage: true });
    console.log('✓ profile-attendance-desktop-light.png');
    await page.close();
  }

  console.log('All QA screenshots regenerated successfully!');
} catch (err) {
  console.error('QA failed:', err);
} finally {
  await browser.close();
}
