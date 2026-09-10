// Visual QA for redesigned Attendance page and Profile widget with stubbed Supabase responses.
//
//   node scripts/qa/qa-attendance.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = '.qa-srmportal';
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

const MOCK_DAILY_ATTENDANCE = [
  {
    id: 'da-1',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    attendance_date: '2026-09-10',
    day_order: 'Thursday',
    period_slot: 2,
    course_code: 'CSE 301',
    course_name: 'Design and Analysis of Algorithms',
    status: 'P',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'da-2',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    attendance_date: '2026-09-10',
    day_order: 'Thursday',
    period_slot: 3,
    course_code: 'CSE 301',
    course_name: 'Design and Analysis of Algorithms',
    status: 'P',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'da-3',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    attendance_date: '2026-09-10',
    day_order: 'Thursday',
    period_slot: 5,
    course_code: 'CSE 304',
    course_name: 'Database Management Systems',
    status: 'A',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'da-4',
    user_id: USER_ID,
    register_number: 'AP21110010001',
    attendance_date: '2026-09-10',
    day_order: 'Thursday',
    period_slot: 7,
    course_code: 'ECE 205',
    course_name: 'Digital Logic and Microprocessors',
    status: 'P',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

const MOCK_TIMETABLE = [
  { id: 'tt-1', user_id: USER_ID, register_number: 'AP23111260062', day_order: 1, day_name: 'Monday', hour: 3, start_time: '11:00:00', end_time: '11:50:00', slot: null, course_code: 'PHY 425', course_name: 'Advanced Quantum Mechanics', faculty_name: 'Dr. Jaganadha Rao', room_number: 'X 312', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-2', user_id: USER_ID, register_number: 'AP23111260062', day_order: 1, day_name: 'Monday', hour: 4, start_time: '12:00:00', end_time: '12:50:00', slot: null, course_code: 'PHY 424', course_name: 'Electronic Materials and Device Physics', faculty_name: 'Dr. J. P. Singh', room_number: 'C 301', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-3', user_id: USER_ID, register_number: 'AP23111260062', day_order: 1, day_name: 'Monday', hour: 6, start_time: '14:00:00', end_time: '14:50:00', slot: null, course_code: 'PHY 425', course_name: 'Advanced Quantum Mechanics', faculty_name: 'Dr. Jaganadha Rao', room_number: 'X 312', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-4', user_id: USER_ID, register_number: 'AP23111260062', day_order: 1, day_name: 'Monday', hour: 7, start_time: '15:00:00', end_time: '15:50:00', slot: null, course_code: 'PHY 424', course_name: 'Electronic Materials and Device Physics', faculty_name: 'Dr. J. P. Singh', room_number: 'C 301', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-5', user_id: USER_ID, register_number: 'AP23111260062', day_order: 2, day_name: 'Tuesday', hour: 5, start_time: '13:00:00', end_time: '13:50:00', slot: null, course_code: 'PHY 426', course_name: 'Computational Physics', faculty_name: 'Dr. Pranab Mandal', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-6', user_id: USER_ID, register_number: 'AP23111260062', day_order: 3, day_name: 'Wednesday', hour: 1, start_time: '09:00:00', end_time: '09:50:00', slot: null, course_code: 'PHY 426', course_name: 'Computational Physics', faculty_name: 'Dr. Pranab Mandal', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-7', user_id: USER_ID, register_number: 'AP23111260062', day_order: 3, day_name: 'Wednesday', hour: 2, start_time: '10:00:00', end_time: '10:50:00', slot: null, course_code: 'PHY 425', course_name: 'Advanced Quantum Mechanics', faculty_name: 'Dr. Jaganadha Rao', room_number: 'X 312', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-8', user_id: USER_ID, register_number: 'AP23111260062', day_order: 3, day_name: 'Wednesday', hour: 3, start_time: '11:00:00', end_time: '11:50:00', slot: null, course_code: 'PHY 424', course_name: 'Electronic Materials and Device Physics', faculty_name: 'Dr. J. P. Singh', room_number: 'C 301', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-9', user_id: USER_ID, register_number: 'AP23111260062', day_order: 3, day_name: 'Wednesday', hour: 4, start_time: '12:00:00', end_time: '12:50:00', slot: null, course_code: 'PHY 425', course_name: 'Advanced Quantum Mechanics', faculty_name: 'Dr. Jaganadha Rao', room_number: 'X 312', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-10', user_id: USER_ID, register_number: 'AP23111260062', day_order: 3, day_name: 'Wednesday', hour: 6, start_time: '14:00:00', end_time: '14:50:00', slot: null, course_code: 'PHY 424', course_name: 'Electronic Materials and Device Physics', faculty_name: 'Dr. J. P. Singh', room_number: 'C 301', is_lab: false, ltpc: '2-0-2-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-11', user_id: USER_ID, register_number: 'AP23111260062', day_order: 4, day_name: 'Thursday', hour: 2, start_time: '10:00:00', end_time: '10:50:00', slot: null, course_code: 'PHY 426', course_name: 'Computational Physics', faculty_name: 'Dr. Pranab Mandal', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-12', user_id: USER_ID, register_number: 'AP23111260062', day_order: 4, day_name: 'Thursday', hour: 3, start_time: '11:00:00', end_time: '11:50:00', slot: null, course_code: 'PHY 427', course_name: 'Statistical Mechanics', faculty_name: 'Dr. Amit Kumar', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-13', user_id: USER_ID, register_number: 'AP23111260062', day_order: 4, day_name: 'Thursday', hour: 5, start_time: '13:00:00', end_time: '13:50:00', slot: null, course_code: 'PHY 426', course_name: 'Computational Physics', faculty_name: 'Dr. Pranab Mandal', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-14', user_id: USER_ID, register_number: 'AP23111260062', day_order: 4, day_name: 'Thursday', hour: 6, start_time: '14:00:00', end_time: '14:50:00', slot: null, course_code: 'PHY 427', course_name: 'Statistical Mechanics', faculty_name: 'Dr. Amit Kumar', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-15', user_id: USER_ID, register_number: 'AP23111260062', day_order: 4, day_name: 'Thursday', hour: 7, start_time: '15:00:00', end_time: '15:50:00', slot: null, course_code: 'PHY 428', course_name: 'Nuclear and Particle Physics', faculty_name: 'Dr. B. C. Paul', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tt-16', user_id: USER_ID, register_number: 'AP23111260062', day_order: 4, day_name: 'Thursday', hour: 8, start_time: '16:00:00', end_time: '17:30:00', slot: null, course_code: 'PHY 428', course_name: 'Nuclear and Particle Physics', faculty_name: 'Dr. B. C. Paul', room_number: 'X 312', is_lab: false, ltpc: '3-1-0-4', last_synced_at: new Date(Date.now() - 3600000).toISOString() },
];

const MOCK_FEE_DUES = [
  {
    id: 'fee-1',
    user_id: USER_ID,
    register_number: 'AP23111260062',
    fee_category: 'Hostel Fees',
    fee_head: 'Hostel Mess Fees (2026-2027)',
    due_amount: 73950,
    collected_amount: 0,
    to_be_paid_amount: 73950,
    is_fine: false,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'fee-2',
    user_id: USER_ID,
    register_number: 'AP23111260062',
    fee_category: 'Hostel Fees',
    fee_head: 'Hostel Room Rent (2026-2027)',
    due_amount: 73950,
    collected_amount: 0,
    to_be_paid_amount: 73950,
    is_fine: false,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_FEE_PAID_HISTORY = [
  {
    id: 'hist-1',
    user_id: USER_ID,
    register_number: 'AP23111260062',
    term: '2026-2027',
    fee_type: 'Student Insurance Fees',
    due_date: null,
    amount: 820,
    receipt_date: '06-07-2026',
    payment_mode: 'Online / University Receipt',
    receipt_number: 'SEAS/55715/26-27',
    paid_amount: 820,
    balance_due: 0,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'hist-2',
    user_id: USER_ID,
    register_number: 'AP23111260062',
    term: '2026-2027',
    fee_type: 'Tuition Fees',
    due_date: null,
    amount: 36900,
    receipt_date: '06-07-2026',
    payment_mode: 'Online / University Receipt',
    receipt_number: 'SEAS/55718/26-27',
    paid_amount: 36900,
    balance_due: 0,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'hist-3',
    user_id: USER_ID,
    register_number: 'AP23111260062',
    term: '2025-2026',
    fee_type: 'Hostel Mess Fees, Hostel Room Rent',
    due_date: null,
    amount: 142680,
    receipt_date: '17-07-2025',
    payment_mode: 'Online / University Receipt',
    receipt_number: 'SEAS/96404/25-26',
    paid_amount: 142680,
    balance_due: 0,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'hist-4',
    user_id: USER_ID,
    register_number: 'AP23111260062',
    term: '2026-2027',
    fee_type: 'Tuition Fee Waiver (Merit Scholarship Concession)',
    due_date: null,
    amount: 209100,
    receipt_date: '06-07-2026',
    payment_mode: 'Institutional Concession / Scholarship',
    receipt_number: 'SCHOLARSHIP-2026-2027',
    paid_amount: 0,
    balance_due: 0,
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

    if (url.includes('/rest/v1/student_daily_attendance')) {
      return respondJson(req, MOCK_DAILY_ATTENDANCE);
    }

    if (url.includes('/rest/v1/student_attendance')) {
      return respondJson(req, MOCK_ATTENDANCE);
    }

    if (url.includes('/rest/v1/student_timetables')) {
      return respondJson(req, MOCK_TIMETABLE);
    }

    if (url.includes('/rest/v1/student_fee_dues')) {
      return respondJson(req, MOCK_FEE_DUES);
    }

    if (url.includes('/rest/v1/student_fee_paid_history')) {
      return respondJson(req, MOCK_FEE_PAID_HISTORY);
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
  console.log('Running SRM Portal UI QA with attendance & timetable stubs...');

  // 1a. SRM Portal: Default Attendance Tab (Desktop Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-attendance-desktop-light.png'), fullPage: true });
    console.log('✓ srmportal-attendance-desktop-light.png');
    await page.close();
  }

  // 1b. SRM Portal: Attendance Tab (Desktop Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/srmportal`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-attendance-desktop-dark.png'), fullPage: true });
    console.log('✓ srmportal-attendance-desktop-dark.png');
    await page.close();
  }

  // 1c. SRM Portal: Attendance Tab (Desktop 1024px Light - zero horizontal scroll test)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 800 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-attendance-desktop-1024px.png'), fullPage: true });
    console.log('✓ srmportal-attendance-desktop-1024px.png');
    await page.close();
  }

  // 1d. SRM Portal: Attendance Tab Mobile (360px Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-attendance-mobile-360px-light.png'), fullPage: true });
    console.log('✓ srmportal-attendance-mobile-360px-light.png');
    await page.close();
  }

  // 1e. SRM Portal: Attendance Tab Mobile (360px Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/srmportal`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-attendance-mobile-360px-dark.png'), fullPage: true });
    console.log('✓ srmportal-attendance-mobile-360px-dark.png');
    await page.close();
  }

  // 2. SRM Portal: Timetable Tab (Desktop Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal?tab=timetable`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-timetable-desktop-light.png'), fullPage: true });
    console.log('✓ srmportal-timetable-desktop-light.png');
    await page.close();
  }

  // 3. SRM Portal: Timetable Tab (Desktop Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/srmportal?tab=timetable`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-timetable-desktop-dark.png'), fullPage: true });
    console.log('✓ srmportal-timetable-desktop-dark.png');
    await page.close();
  }

  // 3b. SRM Portal: Timetable Tab (Desktop 1024px Light - zero horizontal scroll test)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 800 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal?tab=timetable`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-timetable-desktop-1024px.png'), fullPage: true });
    console.log('✓ srmportal-timetable-desktop-1024px.png');
    await page.close();
  }

  // 4. SRM Portal: Timetable Tab (Mobile 360px Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal?tab=timetable`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-timetable-mobile-360px-light.png'), fullPage: true });
    console.log('✓ srmportal-timetable-mobile-360px-light.png');
    await page.close();
  }

  // 5. SRM Portal: Timetable Tab (Mobile 360px Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/srmportal?tab=timetable`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-timetable-mobile-360px-dark.png'), fullPage: true });
    console.log('✓ srmportal-timetable-mobile-360px-dark.png');
    await page.close();
  }

  // 5b. SRM Portal: Timetable Tab Mobile Day with Classes (360px Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal?tab=timetable`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    // Click Thursday pill
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const thuBtn = buttons.find((b) => b.textContent && b.textContent.includes('Thu'));
      if (thuBtn) thuBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-timetable-mobile-360px-classes.png'), fullPage: true });
    console.log('✓ srmportal-timetable-mobile-360px-classes.png');
    await page.close();
  }

  // 6. SRM Portal: Fee & Finance Tab (Desktop Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal?tab=finance`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-finance-desktop-light.png'), fullPage: true });
    console.log('✓ srmportal-finance-desktop-light.png');
    await page.close();
  }

  // 7. SRM Portal: Fee & Finance Tab (Desktop Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/srmportal?tab=finance`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-finance-desktop-dark.png'), fullPage: true });
    console.log('✓ srmportal-finance-desktop-dark.png');
    await page.close();
  }

  // 8. SRM Portal: Fee & Finance Tab (Mobile 360px Light)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'light');
    await page.goto(`${BASE}/srmportal?tab=finance`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-finance-mobile-360px-light.png'), fullPage: true });
    console.log('✓ srmportal-finance-mobile-360px-light.png');
    await page.close();
  }

  // 9. SRM Portal: Fee & Finance Tab (Mobile 360px Dark)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await setupPage(page, 'dark');
    await page.goto(`${BASE}/srmportal?tab=finance`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, 'srmportal-finance-mobile-360px-dark.png'), fullPage: true });
    console.log('✓ srmportal-finance-mobile-360px-dark.png');
    await page.close();
  }

  console.log('All SRM Portal QA screenshots generated successfully in .qa-srmportal!');
} catch (err) {
  console.error('QA failed:', err);
} finally {
  await browser.close();
}
