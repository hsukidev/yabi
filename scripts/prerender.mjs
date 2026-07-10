// Post-build prerender for the SPA. Boots a static server on `dist/`, loads
// each public route in headless Chromium, waits for the React mount to
// complete (signalled by `<html data-rendered="1">` set in src/main.tsx),
// and writes the captured HTML back into `dist/` as a static file per route.
// Crawlers and link previewers (Discord, Twitter, Slack) will see real
// content — with a route-correct <title> and canonical URL — instead of an
// empty <div id="root">, while the existing client bundle still boots and
// replaces the DOM with the live React tree on first paint.
//
// Output layout (directory-style, served by any static host and by an nginx
// `try_files $uri $uri/ /index.html` rule):
//   /          -> dist/index.html
//   /about     -> dist/about/index.html
//   /changelog -> dist/changelog/index.html

import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');

const ORIGIN = 'https://yabi.henesys.io';

// Every public route that should ship prerendered HTML. Keep in sync with
// public/sitemap.xml. Each route's <title> is set by its own component
// (index.html for `/`, a document.title effect for the others), so the
// captured markup already carries the right title — we only rewrite the
// canonical/og:url, which are static in index.html and would otherwise all
// point at `/`.
const routes = [
  { path: '/', out: 'index.html', canonical: `${ORIGIN}/` },
  { path: '/about', out: 'about/index.html', canonical: `${ORIGIN}/about` },
  { path: '/changelog', out: 'changelog/index.html', canonical: `${ORIGIN}/changelog` },
];

// SPA fallback so deep paths still resolve to index.html, mirroring the
// production nginx `try_files` rule.
const serve = sirv(distDir, { single: true, dev: false, etag: false });
const server = createServer((req, res) => serve(req, res, () => {}));

const port = await new Promise((res, rej) => {
  server.once('error', rej);
  server.listen(0, '127.0.0.1', () => res(server.address().port));
});

console.log(`[prerender] static server on http://127.0.0.1:${port}`);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  // Forward console errors so build output flags any runtime breakage
  // that prerender alone would have swallowed.
  page.on('pageerror', (err) => console.error('[prerender] pageerror:', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[prerender] console.error:', msg.text());
  });

  // Capture every route against the pristine empty-shell index.html, THEN
  // write. Writing a baked `dist/index.html` mid-loop would make the SPA
  // fallback serve fully-rendered DOM to the next navigation, and booting
  // React against that throws (error #299) so `data-rendered` never fires.
  const captured = [];
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:${port}${route.path}`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    await page.waitForFunction(() => document.documentElement.dataset.rendered === '1', {
      timeout: 15000,
    });

    // Strip the theme class + render marker so the inline theme bootstrap
    // in <head> wins on the user's browser (otherwise dark-theme users
    // would flash whatever class the headless browser captured), and point
    // canonical/og:url at this route so each page isn't a duplicate of `/`.
    const html = await page.evaluate((canonical) => {
      document.documentElement.classList.remove('dark', 'light');
      delete document.documentElement.dataset.rendered;

      const setLink = (rel) => {
        const el = document.head.querySelector(`link[rel="${rel}"]`);
        if (el) el.setAttribute('href', canonical);
      };
      const setMeta = (property) => {
        const el = document.head.querySelector(`meta[property="${property}"]`);
        if (el) el.setAttribute('content', canonical);
      };
      setLink('canonical');
      setMeta('og:url');

      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, route.canonical);

    captured.push({ route, html });
  }

  for (const { route, html } of captured) {
    const outPath = resolve(distDir, route.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, 'utf8');
    console.log(`[prerender] ${route.path} -> ${route.out} (${html.length} bytes)`);
  }
} finally {
  await browser.close();
  server.close();
}
