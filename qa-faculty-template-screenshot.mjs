import puppeteer from 'puppeteer';

const url = 'http://localhost:5174/marketplace';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

async function activateFacultyTab(currentPage) {
  await currentPage.waitForSelector('[role="tab"]', { timeout: 30000 });
  const tabs = await currentPage.$$('[role="tab"]');

  let facultyHandle = null;
  for (const tab of tabs) {
    const text = await tab.evaluate((el) => (el.textContent || '').toLowerCase().trim());
    if (text.includes('faculty ratings')) {
      facultyHandle = tab;
      break;
    }
  }

  if (!facultyHandle) {
    throw new Error('Faculty Ratings tab not found');
  }

  await facultyHandle.click();
  await currentPage.waitForFunction(() => {
    const activeTab = document.querySelector('[role="tab"][data-state="active"]');
    return (activeTab?.textContent || '').toLowerCase().includes('faculty ratings');
  }, { timeout: 30000 });
}

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await activateFacultyTab(page);
await page.screenshot({ path: 'qa-faculty-desktop.png', fullPage: true });

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await activateFacultyTab(page);
await page.screenshot({ path: 'qa-faculty-mobile.png', fullPage: true });

await browser.close();
console.log('Saved qa-faculty-desktop.png and qa-faculty-mobile.png');
