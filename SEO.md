# SEO.md

Pre-launch SEO pass for `yabi`. Captures what Google and
link previewers saw before the pass, the chosen mitigations, and the
step-by-step actions to ship so the app is actually discoverable when
MapleStory players go looking for a mule planner.

## What crawlers saw before this pass

Anonymous, single-user, browser-local SPA served by nginx behind Caddy on
the VPS. Pre-pass `index.html` contained:

- `<title>YABI</title>` — three letters, zero keywords.
- No `<meta name="description">`, no `<meta name="keywords">`, no
  `<meta name="robots">`, no `<link rel="canonical">`.
- No Open Graph or Twitter card tags — Discord / Reddit / Twitter previews
  showed a blank box.
- No JSON-LD structured data.
- `<div id="root"></div>` empty until the React bundle booted, so any
  crawler that rendered without JS — Bing, older Slackbot, Discordbot,
  Twitterbot — saw nothing at all. Google does render JS, but
  **post-render indexing is queue-delayed** and a 4 KB empty shell still
  ranks worse than an HTML body with real headings.
- No `robots.txt` or `sitemap.xml` under `public/`, so nothing for Search
  Console / Bing Webmaster to ingest.
- No `theme-color`, so the address bar / PWA chrome stayed default grey on
  mobile.

## Goals

Three concerns, in priority order:

1. **(a) Findability for the head query.** A new GMS Reboot player Googling
   "maplestory mule tracker" / "boss crystal calculator reboot" should land
   on this site, not a Reddit thread linking somewhere else. Outcome: site
   appears on page 1 for a small set of long-tail MapleStory keywords.
2. **(b) Shareability in MapleStory communities.** Players don't browse
   from Google — they share links in r/Maplestory, the GMS Reboot Discord,
   and small guild Discords. A blank link preview kills click-through.
   Outcome: every share renders a card with title, description, and the
   app screenshot.
3. **(c) Crawler comprehension regardless of JS.** Search engines and link
   previewers each implement JS rendering differently (or not at all). A
   pre-rendered HTML body is the cheapest insurance against any one
   crawler's quirks.

One stack — head meta + OG/Twitter + structured data + sitemap +
post-build prerender — addresses all three.

---

## Decisions

### 1. Keyword-rich `<title>` and `<meta name="description">`

**Concern.** `<title>` is the single highest-weight on-page signal for
Google. `YABI` matches no real-world query and gets dropped from SERP
ranking entirely.

**Decision.** Title becomes
`YABI — Maplestory's Yet Another Boss Income Tool`, and a
~150-char description names the actual capabilities a Reboot player
searches for: mule roster, weekly boss crystals, top-14 cuts, CRA /
Lomien / Ctene presets, world pricing. The brand name leads; the
description carries the head SEO terms.

**Why these phrases.** Match the literal terms players type into Google
and Discord search — `mule tracker`, `boss crystal calculator`, `top 14`.
Keyword-stuffing is gone but the head terms are present once each.

**What this isn't.** Description tags are _not_ a ranking factor — they
are a click-through factor. Google rewrites them ~40% of the time anyway.
The win is the SERP snippet looking like a tool, not a blank result.

### 2. Open Graph + Twitter card

**Concern.** Every share into Discord / Reddit / Slack / iMessage / Twitter
rendered a bare URL with no preview. This is by far the worst hit for
community-driven discovery.

**Decision.** Add the canonical OG set (`og:type`, `og:site_name`,
`og:url`, `og:title`, `og:description`, `og:image`,
`og:image:width/height/alt`) plus Twitter's `summary_large_image` card,
all pointing at the existing `public/logo.png` (1280×908, served at
`https://yabi.henesys.io/logo.png`).

**Why the existing logo.** It's already 1280px wide which is well above
the 1200px minimum for `summary_large_image`. Replacing it with a
purpose-built 1200×630 card image is a future polish item, not a
launch-blocker.

**What this won't do.** Discord and Slack cache previews aggressively
(~30 days). Any post-deploy iteration on the OG image is invisible to
already-cached threads. Get the first launch right.

### 3. Canonical URL + meta robots + theme-color

**Concern.** Without `<link rel="canonical">`, search engines can fragment
ranking signal across `https://yabi.henesys.io/`,
`https://yabi.henesys.io/?...`, and any future redirected hosts.

**Decision.** Pin the canonical to `https://yabi.henesys.io/`. Add an
explicit `<meta name="robots" content="index,follow">` (default behaviour
made explicit). Add dual `theme-color` entries
(`#0a0a0a` dark, `#fdf6ec` light) so mobile browser chrome matches the
app's theme.

**Why explicit `robots`.** Defensive — if a future infra change ever
serves an `X-Robots-Tag` header by accident, the head tag at least makes
intent grep-able and pinned.

### 4. JSON-LD `WebApplication` schema

**Concern.** Schema.org structured data is the cheapest way to give
Google a typed "this is a free game tool" hint. Improves the chance of
rich SERP results (price annotation, app category) and disambiguates from
unrelated "Maple" results.

**Decision.** Embed a single `application/ld+json` block in `<head>`
declaring `@type: WebApplication`, `applicationCategory: GameApplication`,
`offers: price=0`, and `about: { @type: VideoGame, name: MapleStory }`.

**Why not multiple schema types.** Resist the urge to add `Organization`,
`Person`, `BreadcrumbList`. The site is one page with no author surface
and no breadcrumb tree. Lying to Google's structured data validator is
worse than being silent.

### 5. `<noscript>` fallback heading inside `#root`

**Concern.** Pre-prerender, `<div id="root"></div>` was empty until JS
booted. Crawlers that don't run JS (Bing's first pass, Discordbot,
Slackbot) saw zero on-page content.

**Decision.** Inside `#root`, place a `<noscript>` block with `<h1>` and a
one-paragraph description. JS-enabled crawlers and real users never see
it (React replaces children on mount); JS-disabled crawlers do.

**Why inside `#root`, not above it.** React's `createRoot().render()`
replaces the children of the mount node. Putting fallback content there
means it's automatically removed for real users and never causes a
hydration / DOM-out-of-sync warning.

**Note.** Once decision #7 (prerender) ships, `<noscript>` becomes
belt-and-suspenders — the prerendered tree already supplies real headings.
Keeping it costs nothing and covers the "JS errored at startup" edge case.

### 6. `robots.txt` and `sitemap.xml`

**Concern.** Search Console can't ingest a sitemap if there isn't one,
and `robots.txt` is the conventional place to advertise it.

**Decision.** Two static files in `public/`:

- `public/robots.txt` — `User-agent: *` allow all, plus
  `Sitemap: https://yabi.henesys.io/sitemap.xml`.
- `public/sitemap.xml` — single `<url>` entry for `/`, `weekly`
  `changefreq`. Vite copies `public/*` into `dist/` at build time so
  nginx serves them at `/robots.txt` and `/sitemap.xml`.

**Why a one-URL sitemap.** Search Console accepts it, ranks the same as
a multi-URL one for a single-page app, and prevents the failure mode
where the SPA fallback `try_files $uri $uri/ /index.html;` returns
HTML for `/sitemap.xml` (Google rejects this with
"Sitemap appears to be an HTML page").

**Failure-mode anchor.** The first deploy of section 6 hit exactly this
bug: Search Console reported "Sitemap appears to be an HTML page". Root
cause was a stale Google fetch from before the new image landed; once
`curl -I https://yabi.henesys.io/sitemap.xml` returned `200` with
`content-type: text/xml`, **resubmitting in Search Console** unstuck it.
Don't waste time editing nginx — verify the live response first.

### 7. Post-build prerender so crawlers see real markup

**Concern.** Even with all of #1–#5, `<div id="root">` is empty in the
shipped HTML until the React bundle (~270 KB gzip) downloads, parses, and
mounts. Googlebot's render queue can lag indexing by days; Bing, Discord,
and Twitter's crawlers don't render at all. The 4 KB `index.html` body
gives them no real text to weigh.

**Decision.** Run a Puppeteer-driven prerender as a post-`vite build`
step. The script (`scripts/prerender.mjs`) boots a `sirv` static server
on `dist/`, loads `/` in headless Chromium, waits for the React mount to
signal completion (via `<html data-rendered="1">` set in
`src/main.tsx`), captures `document.documentElement.outerHTML`, strips
the runtime-painted `dark`/`light` class and the `data-rendered` marker,
and writes the result back to `dist/index.html`.

**Why the marker, not a timeout.** Time-based waits are flaky in CI.
A single explicit `data-rendered` attribute, set in `src/main.tsx`
inside `requestAnimationFrame`, is deterministic. The
`waitForFunction(...)` in the prerender script returns the moment React
has committed.

**Why strip the theme class.** Headless Chromium captures whatever theme
the inline `<head>` bootstrap script picked at prerender time (typically
light, since there's no `localStorage`). If we leave the class in, dark-
theme users flash light content for one frame on every cold load. Strip
it; the inline bootstrap re-applies the right class on the user's browser
before paint.

**Why no hydration migration.** `src/main.tsx` uses
`createRoot().render()`, which replaces children of `#root` on mount. The
prerendered tree is overwritten, the user sees a brief flicker (~50–
200 ms), and React never warns. Migrating to `hydrateRoot()` would
eliminate the flicker but adds a real correctness obligation (markup
must match exactly). Acceptable trade-off for SEO; revisit only if the
flicker becomes a perceived-perf complaint.

**Why a separate `build:prerender` script, not flipping `build`.** The
existing `build` script (`tsc -b && vite build`) is exercised by local
dev, e2e fixtures, and any contributor's IDE. Leaving it untouched lets
us validate the prerender path in production for one deploy cycle before
making it the default. Easy revert: change `RUN pnpm build:prerender`
back to `RUN pnpm build` in the Dockerfile.

### 8. Dockerfile builder switch: Alpine → Debian slim

**Concern.** Puppeteer's bundled headless Chromium expects glibc and a
set of X11 / NSS / DBus libraries that Alpine doesn't ship. Running
prerender inside the existing `node:22-alpine` builder fails with
`libnspr4.so: cannot open shared object file`.

**Decision.** Switch builder stage from `node:22-alpine` to
`node:22-bookworm-slim`, install the 12-package Chromium dep set via
`apt-get`, leave the runner stage as `nginx:alpine` so the served image
size is unchanged.

**Why `node:22-bookworm-slim`, not Alpine + system Chromium.**
`apk add chromium` works but pins to whichever Chromium version Alpine
backports, and Puppeteer's protocol expects a specific Chrome major.
Skew shows up as opaque CDP errors weeks later. Debian + Puppeteer's
managed binary is the path the upstream project tests against.

**Build-time impact.** Cold cache: ~30 s for the apt step plus ~5 s for
the Chromium download in `pnpm install`. Warm cache (subsequent CI
runs): both layers are reused, so the net cost is the prerender script
itself (~5–10 s).

**Why keep `nginx:alpine` runner.** All Chromium dependencies live in the
discarded builder stage. The image pulled to the VPS doesn't change.

### 9. `pnpm.onlyBuiltDependencies` in `package.json`

**Concern.** pnpm v10 blocks postinstall scripts by default. Without
opt-in, Puppeteer's Chromium download never runs, the Docker `pnpm
install` finishes with a yellow "Ignored build scripts" warning, and the
prerender at the next layer fails with "Could not find Chrome".

**Decision.** Add `pnpm.onlyBuiltDependencies: ["puppeteer"]` to
`package.json`. The setting is read by pnpm at install time regardless of
whether `pnpm-workspace.yaml` is present in the build context — important
because the Dockerfile copies only `package.json` + `pnpm-lock.yaml`
before running install.

**Why the package.json location, not workspace yaml.** Originally
configured in `pnpm-workspace.yaml`, which gave the right behaviour
locally but broke in Docker because the workspace yaml isn't copied
before `pnpm install`. The `package.json` location works in both
environments without changing the Dockerfile's COPY order.

---

## Action checklist

Each section is split into **Code** (already-landed changes with commit
references where applicable) and **Runtime** (steps you execute against
the VPS, Search Console, or community channels — these don't live in
the repo). Tick the runtime boxes as you go.

### 1. Head meta + OG + Twitter + canonical + theme-color

**Code.** Committed in `b52792e improve seo`.

- `index.html` — replaces three-line stub head with title, description,
  keywords, robots, canonical, dual theme-color, full OG set, Twitter
  `summary_large_image`, and JSON-LD `WebApplication` block. `<noscript>`
  fallback `<h1>` lives inside `<div id="root">`.
- The title/description/OG copy was tweaked post-commit to read
  `Heroic/Interactive` instead of `GMS Reboot` — keep an eye on this if
  you ever auto-generate the head from a config.

**Runtime:**

1. [ ] Verify head tags in production once the deploy lands:
   ```bash
   curl -s https://yabi.henesys.io/ | grep -E \
     '<title>|name="description"|property="og:|name="twitter:|rel="canonical"' | head -15
   ```
2. [ ] Render-check the Open Graph preview (paste the URL):
       https://www.opengraph.xyz/url/https%3A%2F%2Fyabi.henesys.io
       — confirm title, description, and image all populate.
3. [ ] Render-check Discord by pasting `https://yabi.henesys.io/` into
       any throwaway channel — should show a card with the logo. Discord
       caches ~30 days, so do this only when you're confident the head
       tags are final.

### 2. JSON-LD `WebApplication` schema

**Code.** Committed in `b52792e`. `application/ld+json` block in
`index.html`.

**Runtime:**

1. [ ] Validate at https://search.google.com/test/rich-results — paste
       `https://yabi.henesys.io/`, confirm "Page is eligible for rich
       results" with no errors against the WebApplication type.

### 3. `robots.txt` and `sitemap.xml`

**Code.** Committed in `b52792e`.

- `public/robots.txt` — allow-all + sitemap pointer.
- `public/sitemap.xml` — single root URL, `weekly` changefreq.
- Vite copies `public/*` into `dist/` at build time. Nginx serves from
  `/usr/share/nginx/html`, no config change needed.

**Runtime:**

1. [ ] Verify both files are served with the right content-type:
   ```bash
   curl -I https://yabi.henesys.io/robots.txt   # expect text/plain, 200
   curl -I https://yabi.henesys.io/sitemap.xml  # expect text/xml, 200
   ```
   If either returns `text/html` or the SPA shell, the latest deploy
   hasn't picked up `public/`. Re-run `./deploy.sh prod` and wait for
   `docker compose pull && up -d` on the VPS.
2. [ ] Submit sitemap in **Google Search Console**:
   1. Verify `https://yabi.henesys.io/` ownership (DNS TXT or HTML file).
   2. Sitemaps → add `sitemap.xml` → Submit.
   3. If you see "Sitemap appears to be an HTML page", that's the stale-
      fetch failure mode from Decision #6 — confirm the live URL with
      `curl -I` first, then click **Resubmit** to bust the GSC cache.
3. [ ] Submit sitemap in **Bing Webmaster Tools**
       (https://www.bing.com/webmasters) — same flow, separate verification.

### 4. Post-build prerender (Puppeteer + sirv)

**Code.** Pending commit (this session). Files added / modified:

- `scripts/prerender.mjs` — new. Boots `sirv` on `dist/`, launches
  Puppeteer, waits on `document.documentElement.dataset.rendered === '1'`,
  strips theme class + render marker, overwrites `dist/index.html`.
- `src/main.tsx` — sets `document.documentElement.dataset.rendered = '1'`
  inside `requestAnimationFrame` after `createRoot().render()`.
- `package.json` — adds `build:prerender` (`tsc -b && vite build && node
scripts/prerender.mjs`) and `prerender` scripts. Adds
  `pnpm.onlyBuiltDependencies: ["puppeteer"]`. Adds devDeps `puppeteer`,
  `sirv`.
- `pnpm-lock.yaml` — picks up the new devDeps.

**Local validation already done.** `pnpm build:prerender` on this WSL
checkout produces `dist/index.html` at ~37 KB (was ~4 KB) with the React
tree, real `<h2>Roster</h2>`, KPI card markup, and the empty-roster
onboarding state baked in.

**Runtime:**

1.  [ ] If running Puppeteer on a bare Linux dev box (not Docker), install
        the Chromium runtime libs once:
    ```bash
    sudo apt install -y libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libcups2
    ```
        (On Debian bookworm replace `libasound2t64` with `libasound2`.)
2.  [ ] After deploy, verify the live HTML body contains real markup, not
        an empty root:
    ```bash
    curl -s https://yabi.henesys.io/ | grep -E "<h2|Roster|No bosses tallied" | head
    ```
        Expect at least one match per pattern. If the body is still ~4 KB
        and contains `<div id="root"></div>` empty, the Docker build ran
        `pnpm build` instead of `pnpm build:prerender` — re-check the
        Dockerfile diff landed in the deployed image.
3.  [ ] Spot-check on a JS-disabled view: open Chrome devtools → Command
        Menu → "Disable JavaScript" → reload — the page should still
        render the prerendered shell with headings and KPI labels visible.

### 5. Dockerfile builder switch (Alpine → Debian slim)

**Code.** Pending commit (this session).

- `Dockerfile` — builder stage switches from `node:22-alpine` to
  `node:22-bookworm-slim`. Adds `apt-get install -y --no-install-recommends`
  block for the 12 Chromium runtime libs. Final builder step runs
  `pnpm build:prerender` instead of `pnpm build`. Runner stage
  (`nginx:alpine`) is unchanged.

**Runtime:**

1. [ ] First post-merge CI build will be slower than the previous baseline
       (~30–60 s on cold cache). Subsequent builds reuse the apt and
       Chromium-download layers and add only the prerender script's
       runtime (~5–10 s).
2. [ ] If CI fails with `Could not find Chrome` despite the apt step,
       the cause is almost always pnpm's build-script blocklist —
       confirm `package.json` contains `pnpm.onlyBuiltDependencies:
["puppeteer"]` and that the layer running `pnpm install` shows
       `chrome (...) downloaded to /home/.../.cache/puppeteer/chrome/`
       in its log output.
3. [ ] Image size sanity: `docker images | grep yabi`
       — final size should match pre-prerender (Chromium lives in the
       discarded builder stage, not the runner).

### 6. Community / off-page distribution

**Code.** None — this is link-building, not config.

**Runtime (do once after the launch deploy):**

1. [ ] Post once in **r/Maplestory** with a brief description and a
       direct link to `https://yabi.henesys.io/`.
2. [ ] Post in the **GMS Reboot Discord** (#tools or whichever channel
       fits) with the same.
3. [ ] Add a link from a personal site / GitHub repo README under "Live
       app". GitHub-hosted `README.md` links count as backlinks for the
       repo's own indexing path.
4. [ ] If you have a Twitter / Bluesky presence, one announcement post
       with the OG card auto-rendered.

The community backlinks from steps 1–2 will move SERP ranking faster than
any meta-tag tweak. Page-1 ranking for "maplestory boss income tool" on
Google realistically takes 4–8 weeks of indexing + a small tail of
referring domains.

---

## Out of scope for this pass

Deferred deliberately — flagged for a future polish:

- **Dedicated 1200×630 OG card image.** Current `logo.png` (1280×908)
  works but isn't optimised for social cards. A purpose-built card with
  the app screenshot and tagline would increase share click-through.
  Block on first launch traffic data — not worth the design time before
  there are real shares to measure.
- **Hydration migration to `hydrateRoot()`.** Eliminates the ~50–200 ms
  flicker on first paint where React replaces the prerendered tree.
  Adds a real correctness obligation (markup must match exactly).
  Revisit if perceived-perf becomes a complaint, not before.
- **Per-route prerendering.** SPA is currently single-route, so the
  one-URL sitemap and one prerender pass cover everything. If the app
  ever grows a `/world/:id` or `/mule/:id` deep-link, extend
  `scripts/prerender.mjs` to iterate over a URL list and write multiple
  HTML files.
- **Dynamic sitemap generation.** Hand-edited static `sitemap.xml` is
  fine for one URL. If the route count grows, replace with a Vite plugin
  or a postbuild script that walks a route manifest.
- **Lighthouse / Core Web Vitals tuning.** The build warns about the
  848 KB main JS bundle (~270 KB gzipped). Code-splitting and dynamic
  imports would shrink it, lift Lighthouse Performance, and indirectly
  help Google's page-experience signal. Real impact on SEO ranking is
  small for a tools site; address when convenient.
- **Internationalisation hreflang.** All copy is English-only. If a
  future locale lands, add `<link rel="alternate" hreflang="...">` to
  the head.
- **Schema enrichment.** Could add `aggregateRating` if user feedback
  ever ships, or `softwareVersion` from `package.json#version`. Not
  enough surface today to justify either.
- **Analytics / SERP-position tracking.** GSC's "Performance" tab gives
  free query / position / CTR data once the sitemap indexes — sufficient
  for this app's scale. Defer Plausible / Umami until there's a question
  GSC can't answer.
