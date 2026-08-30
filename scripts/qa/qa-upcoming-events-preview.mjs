import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8082';
const OUT = '.qa/upcoming-events';
fs.mkdirSync(OUT, { recursive: true });

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

for (const s of scenarios) {
  const page = await browser.newPage();
  await page.setViewport({ width: s.width, height: s.height });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2000));

  if (s.dark) {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await new Promise((r) => setTimeout(r, 500));
  }

  // Take screenshot of page
  const file = path.join(OUT, `events-${s.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Saved screenshot: ${file}`);

  // Test hover on the first event item if desktop
  if (!s.name.includes('mobile')) {
    const eventLink = await page.$('a[href^="/events/"]');
    if (eventLink) {
      await eventLink.hover();
      await new Promise((r) => setTimeout(r, 1000));
      const hoverFile = path.join(OUT, `events-hover-${s.name}.png`);
      await page.screenshot({ path: hoverFile, fullPage: false });
      console.log(`Saved hover screenshot: ${hoverFile}`);
    }
  }

  await page.close();
}

await browser.close();
console.log('Upcoming events screenshot sweep complete.');
