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
  const svgContent = fs.readFileSync(path.join(publicDir, 'logo-mark-light.svg'), 'utf-8');

  for (const size of [192, 512]) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size });
    
    const html = `<!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#ffffff;">
        <div style="width:${Math.round(size * 0.75)}px;height:${Math.round(size * 0.75)}px;display:flex;align-items:center;justify-content:center;">
          ${svgContent}
        </div>
      </body>
    </html>`;

    await page.setContent(html);
    const outputPath = path.join(publicDir, `pwa-${size}x${size}.png`);
    await page.screenshot({ path: outputPath });
    console.log(`Generated ${outputPath}`);
    await page.close();
  }

  await browser.close();
  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
