import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8081';
const OUT = '.qa/blog-editor-fixes';
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
page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));

// Plant fake session
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
  localStorage.removeItem('fl_blog_draft_new');
}, FAKE_SESSION, USER_ID);

await page.setViewport({ width: 1280, height: 800 });
await page.goto(`${BASE}/blogs/write`, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 1000));

// Set dark theme
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
});

// Set title and content with numbered list
await page.evaluate(() => {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    textarea.value = 'Quantum Computing Workshop Experience';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const editorEl = document.querySelector('.tiptap.ProseMirror');
  if (editorEl) {
    editorEl.innerHTML = `
      <p>Rough</p>
      <ol>
        <li><p>There are 15K students out of which 8K are living on campus</p></li>
        <li><p>Meet different company like Qkrishi, Qubitech and many others small startup under AQV</p></li>
        <li><p>Met Dr. Bharadwaj Mammei from Fraunhoffer, Germany. I have attended his lecture during my online class with WISER. This is where I knew him and was fascinated by his teaching. Particularly, I liked his animation. From his teaching pedagogy, I used to feel this is the teacher I wished to be and if I had to choose one mentor for my quantum journey, it would be him. This was the thought back then when I attended his online class.</p></li>
      </ol>
      <p>Surprisingly, today in QAIC workshop he was right there. My eyes got filled with water because of emotion.</p>
      <p>So AQV (Amaravati Quantum Valley) actually hired him to work with them to mentor student. To be fair, IBM hired him to work with them and IBM allocated him to work with AQV because IBM is partnered with AQV.</p>
      <p>I talked with him. And I asked him how did he make those animation. "You know 3Blue1Brown. He has pioneered a python repository called Manim and I made animation on top of his architecture" was his reply.</p>
      <p>He told me that he will be working from Bengaluru and he will do up and down from Bengaluru.</p>
    `;
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
});
await new Promise((r) => setTimeout(r, 800));

// Capture top before scrolling
await page.screenshot({ path: path.join(OUT, '1-initial-view.png') });
console.log('Saved 1-initial-view.png');

// Scroll down 400px to test sticky toolbar visibility
await page.evaluate(() => {
  window.scrollTo(0, 400);
});
await new Promise((r) => setTimeout(r, 500));

// Check toolbar sticky position and bounding box
const toolbarRect = await page.evaluate(() => {
  const toolbar = document.querySelector('.sticky.z-30');
  if (!toolbar) return null;
  const rect = toolbar.getBoundingClientRect();
  return { top: rect.top, bottom: rect.bottom, height: rect.height, isVisible: rect.top >= 115 };
});
console.log('Toolbar Bounding Rect on scroll:', toolbarRect);

await page.screenshot({ path: path.join(OUT, '2-scrolled-toolbar-visible.png') });
console.log('Saved 2-scrolled-toolbar-visible.png');

// Now test Quote Block inside list item #2
await page.evaluate(() => {
  const items = document.querySelectorAll('.tiptap ol li p');
  if (items[1]) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(items[1]);
    sel.removeAllRanges();
    sel.addRange(range);
    items[1].focus();
  }
});
await new Promise((r) => setTimeout(r, 400));

// Click Quote button in toolbar
const quoteButtonFound = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const quoteBtn = buttons.find((b) => b.getAttribute('title') === 'Quote Block' || b.innerHTML.includes('Quote') || b.querySelector('svg.lucide-quote'));
  if (quoteBtn) {
    quoteBtn.click();
    return true;
  }
  return false;
});
console.log('Quote button clicked:', quoteButtonFound);
await new Promise((r) => setTimeout(r, 800));

const blockquoteCount = await page.evaluate(() => {
  return document.querySelectorAll('.tiptap blockquote').length;
});
console.log('Blockquotes found in editor after click:', blockquoteCount);

await page.screenshot({ path: path.join(OUT, '3-quote-block-applied-from-list.png') });
console.log('Saved 3-quote-block-applied-from-list.png');

// Test mobile viewport at 390px
await page.setViewport({ width: 390, height: 844 });
await page.evaluate(() => {
  window.scrollTo(0, 300);
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: path.join(OUT, '4-mobile-scrolled-toolbar.png') });
console.log('Saved 4-mobile-scrolled-toolbar.png');

await browser.close();
console.log('All QA tests finished successfully!');
