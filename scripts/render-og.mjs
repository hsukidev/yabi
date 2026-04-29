// Renders the OG / social card composition to `public/logo-default.png`.
// Run with: `node scripts/render-og.mjs`
//
// Edit the HTML below to change the card; this script is the source of
// truth for the rendered PNG.

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'public', 'logo-default.png');

const WIDTH = 1200;
const HEIGHT = 630;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Geist:wght@500;700;800&family=JetBrains+Mono:wght@500&display=swap"
    rel="stylesheet"
  />
  <style>
    html, body { margin: 0; padding: 0; }
    body {
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      background: #f6efe4;
      font-family: 'Geist', system-ui, -apple-system, sans-serif;
      color: #3b2f24;
      display: flex;
      align-items: center;
      padding: 0 96px;
      box-sizing: border-box;
      gap: 64px;
      overflow: hidden;
    }
    .badge {
      width: 260px;
      height: 260px;
      border-radius: 56px;
      background: #d97757;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow:
        0 30px 80px rgba(217, 119, 87, 0.28),
        inset 0 2px 0 rgba(255, 255, 255, 0.35);
    }
    .badge svg { width: 64%; height: 64%; display: block; }
    .text { display: flex; flex-direction: column; }
    .word {
      font-size: 168px;
      font-weight: 800;
      letter-spacing: -6px;
      line-height: 0.95;
      color: #3b2f24;
    }
    .tag {
      margin-top: 18px;
      font-size: 32px;
      font-weight: 500;
      letter-spacing: -0.4px;
      color: #6b5a45;
    }
    .url {
      margin-top: 36px;
      font-size: 24px;
      font-weight: 500;
      color: #d97757;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="badge">
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 18 L32 34 L46 18 M32 34 L32 48"
        stroke="#fffaf0"
        stroke-width="7.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </svg>
  </div>
  <div class="text">
    <div class="word">YABI Tool</div>
    <div class="tag">Maplestory's Yet Another Boss Income Tool</div>
    <div class="url">yabi.henesys.io</div>
  </div>
</body>
</html>`;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  await writeFile(outPath, buf);
  console.log(`[render-og] wrote ${outPath} (${WIDTH}x${HEIGHT})`);
} finally {
  await browser.close();
}
