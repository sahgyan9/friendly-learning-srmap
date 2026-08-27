import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

async function generateIcons() {
  const browser = await puppeteer.launch({ headless: true });
  // Using the dark-mode optimized logo (white brackets + vibrant blue F) with full alpha transparency
  const svgContent = fs.readFileSync(path.join(publicDir, 'logo-mark-dark.svg'), 'utf-8');

  for (const size of [192, 512]) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size });
    
    const html = `<!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            overflow: hidden;
          }
          .icon-container {
            width: ${Math.round(size * 0.85)}px;
            height: ${Math.round(size * 0.85)}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="icon-container">
          ${svgContent}
        </div>
      </body>
    </html>`;

    await page.setContent(html);
    const outputPath = path.join(publicDir, `pwa-${size}x${size}.png`);
    await page.screenshot({ path: outputPath, omitBackground: true });
    console.log(`Generated transparent dark-logo icon: ${outputPath}`);
    await page.close();
  }

  await browser.close();
  console.log('All transparent dark-mode PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
