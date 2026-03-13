import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
await page.goto('http://localhost:5173/marketplace', { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForSelector('h3', { timeout: 20000 });

const cards = await page.evaluate(() => {
  const titles = Array.from(document.querySelectorAll('h3')).map((el) => el.textContent?.trim()).filter(Boolean);
  const top = titles.slice(0, 6);
  const snippets = top.map((title) => {
    const heading = Array.from(document.querySelectorAll('h3')).find((el) => el.textContent?.trim() === title);
    const card = heading?.closest('.group') || heading?.closest('.overflow-hidden');
    const text = (card?.textContent || '').replace(/\s+/g, ' ').trim();
    return { title, snippet: text.slice(0, 220) };
  });
  return snippets;
});

console.log(JSON.stringify(cards, null, 2));
await browser.close();
