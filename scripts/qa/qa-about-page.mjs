import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8082';
const OUT = '.qa/about';

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const VIEWPORTS = [
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'desktop-1536', width: 1536, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });

  try {
    await page.goto(`${BASE}/about`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Scroll down to trigger useInView animations
    await page.evaluate(async () => {
      const scrollStep = 300;
      const scrollDelay = 100;
      for (let y = 0; y < document.body.scrollHeight; y += scrollStep) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, scrollDelay));
      }
      window.scrollTo(0, 0);
    });

    await new Promise((r) => setTimeout(r, 1500));

    // Screenshot full page
    await page.screenshot({
      path: path.join(OUT, `about-${vp.name}-light.png`),
      fullPage: true,
    });

    // Toggle dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: path.join(OUT, `about-${vp.name}-dark.png`),
      fullPage: true,
    });

    console.log(`Captured screenshots for ${vp.name} in light and dark mode.`);
  } catch (err) {
    console.error(`Error on ${vp.name}:`, err);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log('Done.');
