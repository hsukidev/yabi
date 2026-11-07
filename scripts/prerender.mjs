// Post-build prerender for the SPA. Boots a static server on `dist/`, loads
// each public route in headless Chromium, waits for the React mount to
// complete (signalled by `<html data-rendered="1">` set in src/main.tsx),
// and writes the captured HTML back into `dist/` as a static file per route.
// Crawlers and link previewers (Discord, Twitter, Slack) will see real
// content — with a route-correct <title> and canonical URL — instead of an
// empty <div id="root">, while the existing client bundle still boots and
// replaces the DOM with the live React tree on first paint.
//
// Output layout (flat `.html` files, served by the nginx
// `try_files $uri $uri.html $uri/ /index.html` rule):
//   /          -> dist/index.html
//   /about     -> dist/about.html
//   /changelog -> dist/changelog.html
//
// Flat files (not `about/index.html`) are deliberate: a directory would make
// nginx 301-redirect `/about` -> `/about/` to append the trailing slash,
// which Search Console reports as a "Redirect error" and which also mismatches
// the trailing-slash-free canonical/sitemap URLs. `$uri.html` serves `/about`
// directly with a 200 and no redirect.

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
// captured markup already carries the right title — we also rewrite the
// canonical/og:url and route-specific description/OG/Twitter tags, which are
// static in index.html and would otherwise all duplicate `/`.
const routes = [
  {
    path: '/',
    out: 'index.html',
    canonical: `${ORIGIN}/`,
    ogTitle: 'YABI — Yet Another Maplestory Income Tracker',
    description:
      'Free MapleStory income tracker for weekly boss crystals. Track mule income, roster totals, and per-world caps.',
    ogDescription:
      'Track weekly Maplestory boss crystal income across your roster. Create boss presets and track meso totals by world, crystal caps, and mule share percentages.',
  },
  {
    path: '/about',
    out: 'about.html',
    canonical: `${ORIGIN}/about`,
    ogTitle: 'About — YABI MapleStory Income Tracker',
    description:
      'Learn how YABI tracks weekly MapleStory boss crystal income across Heroic and Interactive worlds using browser-local roster storage and Nexon Ranking lookups.',
    ogDescription:
      'About YABI, a free fan-made MapleStory weekly boss crystal calculator and mule roster income tracker.',
  },
  {
    path: '/changelog',
    out: 'changelog.html',
    canonical: `${ORIGIN}/changelog`,
    ogTitle: 'Changelog — YABI MapleStory Income Tracker',
    description:
      'Release notes and latest updates for YABI, including new MapleStory bosses, crystal price updates, presets, and roster tracking features.',
    ogDescription:
      'Stay up to date with the latest MapleStory boss crystal updates, features, and fixes in YABI.',
  },
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
    const html = await page.evaluate((meta) => {
      document.documentElement.classList.remove('dark', 'light');
      delete document.documentElement.dataset.rendered;

      const setLink = (rel, value) => {
        const el = document.head.querySelector(`link[rel="${rel}"]`);
        if (el) el.setAttribute('href', value);
      };
      const setMetaProperty = (property, value) => {
        const el = document.head.querySelector(`meta[property="${property}"]`);
        if (el) el.setAttribute('content', value);
      };
      const setMetaName = (name, value) => {
        const el = document.head.querySelector(`meta[name="${name}"]`);
        if (el) el.setAttribute('content', value);
      };
      setLink('canonical', meta.canonical);
      setMetaProperty('og:url', meta.canonical);
      setMetaProperty('og:title', meta.ogTitle);
      setMetaProperty('og:description', meta.ogDescription);
      setMetaName('description', meta.description);
      setMetaName('twitter:title', meta.ogTitle);
      setMetaName('twitter:description', meta.ogDescription);

      // Strip dnd-kit's screen-reader scaffolding from the static snapshot.
      // dnd-kit renders a hidden `#DndDescribedBy-*` instructions node ("To
      // pick up a draggable item, press the space bar…") plus an empty
      // `#DndLiveRegion-*` announcer. No drag can happen in a crawl snapshot,
      // so this boilerplate is pure indexable noise — on the near-empty
      // homepage it was the single largest block of text Google saw, which
      // feeds the "Crawled – currently not indexed" verdict. The live bundle
      // recreates both nodes on hydration, so real screen-reader users are
      // unaffected.
      document.querySelectorAll('[id^="DndDescribedBy-"], [id^="DndLiveRegion-"]').forEach((el) => {
        document
          .querySelectorAll(`[aria-describedby="${el.id}"]`)
          .forEach((ref) => ref.removeAttribute('aria-describedby'));
        el.remove();
      });

      return '<!doctype html>\n' + document.documentElement.outerHTML;
    }, route);

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
