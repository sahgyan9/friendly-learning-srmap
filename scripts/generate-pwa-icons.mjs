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
  
  // 1. Dark logo markup with brand colors (Blue F #3963C6, White L & Brackets #F8FAFC)
  const darkLogoSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="201 81 397 421">
      <path d="M273,216L277,216L277,217L278,217L278,219L277,219L277,220L276,220L276,221L275,221L275,220L224,220L224,349L426,349L426,217L542,217L542,218L543,218L543,220L542,220L542,349L543,349L543,351L542,351L542,352L515,352L515,353L513,353L513,352L512,352L512,351L511,351L511,350L512,350L512,348L516,348L516,349L539,349L539,220L429,220L429,352L221,352L221,217L273,217Z" fill="#F8FAFC"/>
      <path d="M286,101L429,101L429,147L335,147L335,199L409,199L409,243L335,243L335,334L286,334Z" fill="#3963C6"/>
      <path d="M447,243L496,243L496,435L578,435L578,482L447,482Z" fill="#F8FAFC"/>
    </svg>
  `;

  // 2. Notification badge with brand blue F (#3963C6) and crisp white L & bracket (#FFFFFF)
  const badgeSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="201 81 397 421">
      <path d="M273,216L277,216L277,217L278,217L278,219L277,219L277,220L276,220L276,221L275,221L275,220L224,220L224,349L426,349L426,217L542,217L542,218L543,218L543,220L542,220L542,349L543,349L543,351L542,351L542,352L515,352L515,353L513,353L513,352L512,352L512,351L511,351L511,350L512,350L512,348L516,348L516,349L539,349L539,220L429,220L429,352L221,352L221,217L273,217Z" fill="#FFFFFF"/>
      <path d="M286,101L429,101L429,147L335,147L335,199L409,199L409,243L335,243L335,334L286,334Z" fill="#3963C6"/>
      <path d="M447,243L496,243L496,435L578,435L578,482L447,482Z" fill="#FFFFFF"/>
    </svg>
  `;

  const renderIcon = async ({ size, bg, svg, scale = 0.75, outputPath, transparent = false }) => {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    
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
            background: ${transparent ? 'transparent' : bg};
            overflow: hidden;
          }
          .icon-container {
            width: ${Math.round(size * scale)}px;
            height: ${Math.round(size * scale)}px;
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
          ${svg}
        </div>
      </body>
    </html>`;

    await page.setContent(html);
    await page.screenshot({ path: outputPath, omitBackground: transparent });
    console.log(`Generated icon: ${path.basename(outputPath)} (${size}x${size}, bg: ${transparent ? 'transparent' : bg})`);
    await page.close();
  };

  // 1. Standard PWA icons (solid dark background #0F172A for guaranteed contrast and crispness)
  await renderIcon({
    size: 192,
    bg: '#0F172A',
    svg: darkLogoSvg,
    scale: 0.75,
    outputPath: path.join(publicDir, 'pwa-192x192.png')
  });

  await renderIcon({
    size: 512,
    bg: '#0F172A',
    svg: darkLogoSvg,
    scale: 0.75,
    outputPath: path.join(publicDir, 'pwa-512x512.png')
  });

  // 2. Maskable PWA icon (solid dark background, logo scaled to 60% safe zone per W3C maskable spec)
  await renderIcon({
    size: 512,
    bg: '#0F172A',
    svg: darkLogoSvg,
    scale: 0.60,
    outputPath: path.join(publicDir, 'pwa-maskable-512x512.png')
  });

  // 3. Apple Touch Icon (180x180, solid dark background)
  await renderIcon({
    size: 180,
    bg: '#0F172A',
    svg: darkLogoSvg,
    scale: 0.75,
    outputPath: path.join(publicDir, 'apple-touch-icon.png')
  });

  // 4. Notification badge (96x96, solid dark background #0F172A to shield #3963C6 blue F from blending with OS blue container)
  await renderIcon({
    size: 96,
    bg: '#0F172A',
    svg: darkLogoSvg,
    scale: 0.80,
    transparent: false,
    outputPath: path.join(publicDir, 'badge-96x96.png')
  });

  await browser.close();
  console.log('All PWA, Apple touch, and Notification badge assets generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
