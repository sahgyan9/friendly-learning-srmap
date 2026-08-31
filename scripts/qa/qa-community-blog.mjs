import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5178';
const OUT = '.qa/community-blog';
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
    email: 'asha.k@srmap.edu.in',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

console.log('Connecting to dev server at', BASE);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message, err.stack));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('PAGE CONSOLE ERROR:', msg.text());
});

// Plant fake session and profile in localStorage
await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
await page.evaluate((session, uid) => {
  localStorage.setItem(`sb-ruapdkrgcbqrhvsayvpf-auth-token`, JSON.stringify(session));
  localStorage.setItem(
    `offline_profile_${uid}`,
    JSON.stringify({
      id: uid,
      name: 'Asha Kumar',
      email: 'asha.k@srmap.edu.in',
      role: 'student',
      is_admin: false,
      verification_status: 'verified',
      has_seen_welcome_tour: true,
    })
  );
}, FAKE_SESSION, USER_ID);

// Intercept supabase calls to return mock posts
await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('/rest/v1/rpc/get_blog_posts')) {
    req.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'b1',
          slug: 'winning-smart-india-hackathon-2026',
          title: 'How Our Team Won SIH 2026: From Idea to Working Prototype',
          excerpt: 'A complete breakdown of our 36-hour hackathon journey, architecture choices, and presentation tips for SRM AP students.',
          cover_image_url: 'gradient:linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #3963c6 100%)',
          tags: ['hackathons', 'tech & dev', 'projects'],
          author_id: USER_ID,
          author_name: 'Asha Kumar',
          author_image: null,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          view_count: 142,
          total_count: 2,
        },
        {
          id: 'b2',
          slug: 'survival-guide-first-year-cse',
          title: 'The Unofficial Survival Guide for First-Year CSE at SRM AP',
          excerpt: 'What courses actually matter, how to balance clubs and academics, and where to find the best quiet study spots on campus.',
          cover_image_url: 'gradient:linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
          tags: ['campus life', 'academics', 'guides'],
          author_id: 'other',
          author_name: 'Rahul Sharma',
          author_image: null,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          view_count: 389,
          total_count: 2,
        },
      ]),
    });
    return;
  }
  req.continue();
});

const testCases = [
  { name: 'blogs-directory-desktop-light', path: '/blogs', width: 1280, height: 900, dark: false },
  { name: 'blogs-directory-desktop-dark', path: '/blogs', width: 1280, height: 900, dark: true },
  { name: 'blogs-directory-mobile', path: '/blogs', width: 390, height: 844, dark: false },
  { name: 'write-blog-desktop-light', path: '/blogs/write', width: 1280, height: 900, dark: false },
  { name: 'write-blog-desktop-dark', path: '/blogs/write', width: 1280, height: 900, dark: true },
  { name: 'write-blog-mobile', path: '/blogs/write', width: 390, height: 844, dark: false },
];

for (const tc of testCases) {
  await page.setViewport({ width: tc.width, height: tc.height });
  await page.goto(`${BASE}${tc.path}`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));

  // Set theme
  await page.evaluate((isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, tc.dark);
  await new Promise((r) => setTimeout(r, 400));

  const filepath = path.join(OUT, `${tc.name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`Saved screenshot: ${filepath}`);
}

// Interactive typing screenshot of /blogs/write
await page.setViewport({ width: 1280, height: 900 });
await page.goto(`${BASE}/blogs/write`, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 1000));

await page.evaluate(() => {
  const titleArea = document.querySelector('textarea');
  if (titleArea) {
    titleArea.value = 'How We Built CampusBrain: Neural Search for SRM AP';
    titleArea.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await new Promise((r) => setTimeout(r, 800));

const sampleFile = path.join(OUT, 'write-blog-interactive.png');
await page.screenshot({ path: sampleFile, fullPage: true });
console.log(`Saved interactive screenshot: ${sampleFile}`);

await browser.close();
console.log('Visual QA complete! All screenshots captured in', OUT);
