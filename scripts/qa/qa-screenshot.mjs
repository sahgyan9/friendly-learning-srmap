// Visual QA harness: loads the key routes at desktop and mobile widths, saves
// screenshots to .qa/, and reports any console/page errors.
//
//   node qa-screenshot.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5178';
const OUT = '.qa';

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'faculty', path: '/faculty' },
  { name: 'community', path: '/community-posts' },
  { name: 'signin', path: '/signin' },
  { name: 'mentors', path: '/mentors' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

let failures = 0;

for (const viewport of VIEWPORTS) {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height });

    const problems = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle2', timeout: 45000 });
      // Let lazy chunks and data fetches settle.
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const file = path.join(OUT, `${route.name}-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: viewport.name === 'desktop' });

      const heading = await page
        .$eval('h1', (element) => element.textContent.trim())
        .catch(() => '(no h1)');

      const chars = await page.$eval('body', (element) => element.innerText.trim().length);

      const status = problems.length ? 'ERRORS' : 'ok';
      if (problems.length) failures += 1;

      console.log(
        `[${status.padEnd(6)}] ${viewport.name.padEnd(7)} ${route.path.padEnd(18)} h1="${heading}" chars=${chars}`,
      );
      problems.slice(0, 4).forEach((problem) => console.log(`           ${problem.slice(0, 170)}`));
    } catch (error) {
      failures += 1;
      console.log(`[FAIL  ] ${viewport.name} ${route.path} -> ${error.message}`);
    }

    await page.close();
  }
}

await browser.close();
console.log(
  failures === 0
    ? '\nAll routes rendered without page errors.'
    : `\n${failures} route/viewport combination(s) reported problems.`,
);
