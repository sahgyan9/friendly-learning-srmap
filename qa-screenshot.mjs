import puppeteer from 'puppeteer';

const url = 'http://localhost:5173/marketplace';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('[role="tab"][data-state="active"]', { timeout: 20000 });
await page.screenshot({ path: 'qa-round1-desktop.png', fullPage: true });

const extracted = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('h3')).slice(0, 12).map((h3) => {
    const card = h3.closest('[class*="group"]') || h3.parentElement?.parentElement;
    const text = card?.textContent || '';
    const dateMatch = text.match(/\b\d{1,2}\s[A-Za-z]{3}\s\d{4}(\s-\s\d{1,2}\s[A-Za-z]{3}\s\d{4})?/);
    const state = /LIVE NOW|UPCOMING|ENDED/.exec(text)?.[0] || '';
    return { title: h3.textContent?.trim() || '', date: dateMatch?.[0] || '', state };
  });
  return cards;
});

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('[role="tab"][data-state="active"]', { timeout: 20000 });
await page.screenshot({ path: 'qa-round1-mobile.png', fullPage: true });

console.log(JSON.stringify(extracted, null, 2));
await browser.close();
