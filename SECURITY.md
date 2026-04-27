# SECURITY.md

Pre-launch security review for `ms-mule-income-tracker`. Captures the threat
model, the chosen mitigations, and the step-by-step actions to ship before the
app is opened to public users.

## Architecture in one paragraph

Anonymous, single-user, browser-local SPA (state lives in `localStorage` —
no accounts, no backend DB). One Cloudflare Worker endpoint
(`worker/src/worker.ts`) at `GET /api/character/:name?worldId=…` proxies to
Nexon's no-auth ranking API and caches success responses for 6h, 404s for 1h.
The SPA is served from a self-hosted VPS (Docker → Caddy → nginx) and `/api/*`
is reverse-proxied through nginx to `*.workers.dev`. Avatar URLs from Nexon are
rendered directly into `<img src>` (`src/components/CharacterAvatar.tsx:77`).

## Threat model

Four concerns, in priority order:

1. **(a) Cost / quota burn.** An attacker iterates random `name` values to
   defeat the 6h cache, forcing 1:1 Worker→Nexon fanout. Outcomes: Cloudflare
   Workers free-tier blown, Nexon rate-limits or bans the Worker IP/account
   and the lookup feature dies for every legit user. Likeliest to materialize.
2. **(c) Abuse-as-proxy.** The Worker becomes a free, anonymous Nexon-ranking
   API for someone else's bot. Same root cause as (a); fixing (a) substantially
   addresses this.
3. **(d) ToS / reputation.** Unattended scraping with a generic
   `User-Agent` is exactly the traffic shape Nexon would block first.
4. **(b) Service availability.** If (a) is contained, the Worker stays healthy.

One mitigation stack — rate limit + origin gate + input validation +
self-identification — collapses (a), (b), (c) together. (d) is one extra
header.

## Pre-flight: the false alarm

A recon pass flagged `.sandcastle/.env` as containing live OAuth tokens checked
into the repo. **Verified false positive.** The file exists locally but is
gitignored via `.sandcastle/.gitignore` and has never been committed. No
action required.

---

## Decisions

### 1. Rate limit at Caddy on the VPS

**Concern.** The Worker has no rate limit. A simple `curl` loop with random
names defeats the cache and triggers unlimited Nexon round-trips.

**Decision.** Cap `/api/*` at **30 requests/minute/IP** at Caddy, return 429.

**Why this layer.** Traffic flows browser → Caddy → nginx → workers.dev. The
_real client IP_ is the connection IP only at Caddy. Rate-limiting at
Cloudflare's WAF on `workers.dev` would lump every legitimate user into one
bucket (your VPS's outbound IP) while giving direct attackers their own
bucket — exactly backwards. Rate-limiting at Caddy avoids any header-forwarding
gymnastics, and rejected requests never leave your VPS, so they don't burn
Worker requests either.

**Why 30/min.** Far above what a legit user does (<5/min in practice), far
below what an attacker needs to do real damage. Tunable later from telemetry.

### 2. Lock the Worker behind a shared-secret header

**Concern.** Even with Caddy rate-limiting, the Worker is publicly callable at
`https://<your-worker-slug>.workers.dev/api/...`.
Attackers bypass the VPS entirely and the rate limit doesn't apply.

**Decision.** nginx attaches `X-Proxy-Auth: <secret>` to every proxied call;
the Worker rejects requests without the matching secret with **404** (not
401 — 404 reveals less about whether the route exists).

**Why shared secret over alternatives.**

- Origin/Referer header check is forgeable with `curl -H` and only blocks
  lazy-browser-driven abuse.
- Cloudflare Access / mTLS is a paid SKU and overkill for one internal hop.
- IP allowlisting re-couples the Worker to your VPS's outbound IP.

A shared secret is ~15 lines total, recoverable in seconds (`wrangler secret
put` + redeploy nginx), and makes the Worker effectively private without
paying for Access.

**Repo-is-public tripwire.** The secret value must come from an env var
injected at build/run time — never committed to `nginx.conf`.

### 3. Validate `name` input, cache the 400

**Concern.** No length cap or charset check on `name`. Random Unicode
guarantees a cache miss every time → Nexon call. Long names produce log
noise and unbounded upstream payloads. Repeat invalid names re-run the
Worker on every hit instead of being served from cache.

**Decision.**

- Regex `/^[A-Za-z0-9]{2,13}$/` (matches MapleStory NA name rules). Reject
  with `400 invalid-name` before any cache or Nexon call.
- Return the 400 with `cache-control: public, max-age=3600` and `cache.put`
  it, so repeat junk from the same attacker becomes a CF cache hit.

**Why not broader Unicode.** Worlds in scope are NA/EU only per
`worker/src/worldIdMap.ts`. Relax later if scope expands.

**What this isn't.** Charset validation does not meaningfully shrink the
attacker's search space (62¹³ ≈ 2 quadrillion names is plenty to defeat the
cache). The real defense against unique-name flooding is the Caddy rate
limit. Input validation is the cheap belt-and-suspenders that short-circuits
malformed requests before Nexon and prevents log/cache poisoning.

### 4. Security headers on the SPA (CSP + companions)

**Concern.** `nginx.conf` sets zero security headers. `<img>`, `<script>`,
and `<iframe>` boundaries are wide open. A compromised Nexon CDN could be
used to render attacker-chosen URLs into `<img>` (low XSS risk, real
tracking-pixel / referrer-leak risk).

**Decision.** Add the following to `nginx.conf` (per-app, version-controlled):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://msavatar1.nexon.net https://nxfs.nexon.com;
  connect-src 'self';
  font-src 'self' data:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';

Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

**Why these choices.**

- `script-src 'self'` (no `'unsafe-inline'`) — Vite bundles everything; no
  inline scripts. Most important rule.
- `style-src 'self' 'unsafe-inline'` — React's `style={{}}` props compile to
  `style=""` attributes, which CSP counts as inline. Unavoidable for this
  stack without a nonce setup.
- `img-src` is the browser-enforced avatar allowlist — defense in depth
  against an upstream Nexon compromise.
- `connect-src 'self'` — all `fetch` is same-origin via the nginx proxy.
- `frame-ancestors 'none'` replaces `X-Frame-Options: DENY`.

**Why nginx, not Caddy.** Headers are app-specific (the Nexon hosts in
`img-src` are unique to this app), so they belong in app config, not the
host-level Caddyfile. Travels with the app if you ever migrate off Caddy.

**Pre-launch verification.** Build, serve, click through every screen with
DevTools open. Any `Refused to load …` console errors mean a CSP rule needs
adjustment.

### 5. Identify yourself to Nexon

**Concern.** `worker/src/nexonAdapter.ts:85` calls `fetch(url)` with no
custom headers. Your traffic is indistinguishable from any other scraper.
Nexon's ops team has no contact channel and you'd be collateral in any
anti-bot crackdown.

**Decision.** Set a self-identifying `User-Agent` on the outbound call:

```
User-Agent: ms-mule-income-tracker/1.0 (+https://github.com/hsukidev/ms-mule-income-tracker)
```

**Why repo URL, not email.** The repo is already public; GitHub issues are
a public, non-PII, low-spam contact channel. Email gets harvested.

**What this won't do.** Won't prevent a blanket Nexon ban on no-auth
scraping — but it makes you a recognizable, contactable integration if they
ever want to reach out instead of just blocking.

### 6. Telemetry — know if any of this is working

**Concern.** Without observability, every defense above is write-only. The
two questions you actually have at launch are "is the free tier melting?"
and "is the lookup feature broken?"

**Decision.** Logs + Cloudflare usage alert.

- Caddy access log persisted to a Docker volume (so container restarts
  don't lose history).
- Cloudflare Workers usage alert via the dashboard at ~50% of free tier
  (50k req/day) — emails you when crossed.
- Structured `console.log` lines at the three Worker rejection branches:
  `invalid-name`, `proxy-auth-fail`, `upstream-failed`. JSON-formatted so
  they're greppable. **Truncate `name` to 20 chars in logs** — full
  attacker-controlled names risk log injection / disk fill.

**Why not Sentry / Analytics Engine yet.** Add when traffic justifies a
dashboard. At launch, weekly log review is enough.

**Operational runbook — practice once before launch.** Rotating the worker
secret should be a 60-second operation:

1. `openssl rand -hex 32` — new secret
2. `wrangler secret put PROXY_SECRET` — paste new value
3. Update VPS env var, `docker compose up -d` — nginx restarts with new value

---

## Action checklist

Each section is split into **Code** (already-landed changes with commit
references) and **Runtime** (steps you execute against Cloudflare or the
VPS — these don't live in the repo). Tick the runtime boxes as you go.

### 1. Caddy rate limit

**Code.** None — Caddy is runtime config only.

**Runtime (on VPS, in `~/app/`):**

1. [ ] Create custom Caddy image with the rate-limit module:

   ```bash
   mkdir -p caddy
   cat > caddy/Dockerfile <<'EOF'
   FROM caddy:builder AS builder
   RUN xcaddy build --with github.com/mholt/caddy-ratelimit

   FROM caddy:latest
   COPY --from=builder /usr/bin/caddy /usr/bin/caddy
   EOF
   ```

2. [ ] Update the `caddy` service in `~/app/docker-compose.yml` —
       replace `image: caddy:latest` with:
   ```yaml
   build:
     context: ./caddy
   image: caddy-with-ratelimit:latest
   ```
3. [ ] Add the `rate_limit` directive to `~/app/Caddyfile` for both sites
       (separate zones so prod and staging buckets don't collide):

   ```caddyfile
   mules.henesys.io {
       @api path /api/*
       rate_limit @api {
           zone api_per_ip { key {client.ip}; events 30; window 1m }
       }
       reverse_proxy mules:80
   }

   snow-yeti.henesys.io {
       @api path /api/*
       rate_limit @api {
           zone api_per_ip_staging { key {client.ip}; events 30; window 1m }
       }
       reverse_proxy snow-yeti:80
   }
   ```

4. [ ] Build, validate, apply:
   ```bash
   docker compose build caddy
   docker compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile
   docker compose up -d caddy
   ```
5. [ ] Confirm the rate-limit module is loaded:
       `docker compose exec caddy caddy list-modules | grep rate_limit`
6. [ ] Verify 429s fire from a local machine (not the VPS):
   ```bash
   for i in $(seq 1 50); do
     curl -s -o /dev/null -w "%{http_code} " \
       https://mules.henesys.io/api/character/AliceK?worldId=heroic-kronos
   done; echo
   ```
   Expect ~30 successes followed by 429s.

### 2. Worker shared-secret gate

**Code.** Committed in `29898a5` (gate + `Env` interface + 4 gate tests +
fail-loud production handler) and `c5902fd` (`${WORKER_HOST}` variable
extraction).

- `worker/src/worker.ts` — `HandlerDeps.proxySecret`, `Env`, gate check at
  top of `handleLookup`, 503 fail-loud when `env.PROXY_SECRET` is unset.
- `worker/src/__tests__/worker.test.ts` — 4 gate tests; `get()` helper
  extended to accept headers.
- `nginx.conf` → `nginx.conf.template` — `proxy_set_header X-Proxy-Auth
"${PROXY_SECRET}";`, `proxy_pass https://${WORKER_HOST}/api/;`.
- `Dockerfile` — copies template into `/etc/nginx/templates/` and pins
  `NGINX_ENVSUBST_FILTER=^(PROXY_SECRET|WORKER_HOST)$`.

**Runtime:**

1. [ ] Generate a secret (run once locally — copy the 64-char hex output):
   ```bash
   openssl rand -hex 32
   ```
2. [ ] Push it to the Worker and deploy:
   ```bash
   cd worker
   pnpm exec wrangler secret put PROXY_SECRET   # paste when prompted
   pnpm exec wrangler deploy
   ```
3. [ ] Create / update `~/app/.env` on the VPS (chmod 600):
   ```
   PROXY_SECRET=<paste the same 64-char value>
   WORKER_HOST=<your-worker-slug>.workers.dev
   ```
4. [ ] Apply on the VPS — nginx restarts with the new template values:
   ```bash
   cd ~/app
   docker compose up -d
   ```
5. [ ] Verify direct hit to workers.dev is rejected:
   ```bash
   curl -i https://<your-worker-slug>.workers.dev/api/character/Alice?worldId=heroic-kronos
   ```
   Expect `404`.
6. [ ] Verify proxied lookup still works in the browser at
       `https://mules.henesys.io`.

### 3. Input validation + cached 400

**Code.** Committed in `29898a5`.

- `worker/src/worker.ts` — `VALID_NAME = /^[A-Za-z0-9]{2,13}$/`,
  `INVALID_NAME_TTL_SECONDS = 3600`, validation block placed after the
  cache lookup (so repeat invalid requests are served from cache without
  re-running the regex).
- `worker/src/__tests__/worker.test.ts` — 4 tests: invalid charset,
  too-short, too-long, cached-400.

**Runtime:**

1. [ ] Ships with the same `wrangler deploy` you ran in section 2.
2. [ ] Sanity-check (replace `$PROXY_SECRET` with the real value):
   ```bash
   curl -i -H "x-proxy-auth: $PROXY_SECRET" \
     "https://mules.henesys.io/api/character/x?worldId=heroic-kronos"
   ```
   Expect `400` with `{"error":"invalid-name", ...}` (single char fails
   the `{2,13}` length rule).

### 4. Security headers in nginx

**Code.** Committed in `29898a5`.

- `nginx.conf.template` — full CSP plus HSTS, `nosniff`, `Referrer-Policy`,
  and `Permissions-Policy`, all with the `always` flag. CSP includes a
  SHA-256 hash for the inline theme-bootstrap `<script>` in `index.html`
  (lines 14–23) so we don't need `'unsafe-inline'` in `script-src`.

**Runtime:**

1. [ ] Verify all five headers in production:
   ```bash
   curl -I https://mules.henesys.io/ | grep -iE \
     'content-security|strict-transport|x-content|referrer|permissions'
   ```
2. [ ] Click through the deployed app with DevTools Console open — confirm
       zero `Refused to load …` or `Refused to apply inline style …`
       violations.
3. [ ] **If the inline theme script in `index.html` is ever edited**,
       recompute the CSP hash and update `nginx.conf.template`:
   ```bash
   python3 -c "
   import re, hashlib, base64
   html = open('dist/index.html').read()
   m = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
   h = hashlib.sha256(m.group(1).encode()).digest()
   print('sha256-' + base64.b64encode(h).decode())
   "
   ```

### 5. User-Agent on Nexon calls

**Code.** Committed in `29898a5`.

- `worker/src/nexonAdapter.ts` — `USER_AGENT` constant
  (`ms-mule-income-tracker/1.0 (+https://github.com/hsukidev/ms-mule-income-tracker)`)
  threaded into the outbound `fetch`.
- `worker/src/__tests__/nexonAdapter.test.ts` — test asserts the header is
  sent.

**Runtime:**

1. [ ] Ships with the same `wrangler deploy` from section 2 — no separate
       step required.

### 6. Telemetry

#### 6a. Worker structured logs

**Code.** Committed in `eaca084`. Adds `console.log(JSON.stringify({...}))`
at three rejection branches in `worker/src/worker.ts`: `proxy-auth-fail`,
`invalid-name` (with `name` truncated to 20 chars to prevent log
injection), and `upstream-failed` (with upstream `status` and `message`).
The fourth event, `proxy-secret-missing`, was already in `29898a5`.

**Runtime:**

1. [ ] Deploy: `cd worker && pnpm exec wrangler deploy`.
2. [ ] Verify each event fires. In one terminal:

   ```bash
   cd worker && pnpm exec wrangler tail
   ```

   In another, trigger each branch (replace `$SECRET` with the real value):

   ```bash
   # proxy-auth-fail
   curl https://<your-worker-slug>.workers.dev/api/character/Alice?worldId=heroic-kronos

   # invalid-name
   curl -H "x-proxy-auth: $SECRET" \
     "https://<your-worker-slug>.workers.dev/api/character/x?worldId=heroic-kronos"
   ```

   Expect one JSON event line per request in the tail.

#### 6b. Caddy access logs persisted

**Runtime (on VPS):**

1. [ ] Add a `log` block to each site in `~/app/Caddyfile`:
   ```caddyfile
   log {
       output file /var/log/caddy/<site>-access.log {
           roll_size 10MiB
           roll_keep 5
           roll_keep_for 720h
       }
       format json
   }
   ```
   (Use distinct filenames per site, e.g. `mules-access.log` and
   `snow-yeti-access.log`.)
2. [ ] In `~/app/docker-compose.yml`, add the volume mount to the `caddy`
       service:
   ```yaml
   volumes:
     - ./Caddyfile:/etc/caddy/Caddyfile
     - caddy_data:/data
     - caddy_config:/config
     - caddy_logs:/var/log/caddy
   ```
   And declare it at the bottom of the file:
   ```yaml
   volumes:
     caddy_data:
     caddy_config:
     caddy_logs:
   ```
3. [ ] Apply: `docker compose up -d caddy`.
4. [ ] After a few requests, sanity-check:
   ```bash
   docker compose exec caddy tail /var/log/caddy/mules-access.log
   ```

#### 6c. Cloudflare Workers usage alert

1. [ ] Cloudflare dashboard → **Workers & Pages → `<your-worker>` → Settings → Notifications**.
2. [ ] Add a usage notification at **50,000 requests/day** (50% of the
       100k free-tier ceiling).
3. [ ] Confirm email destination is your account email.

#### 6d. Secret-rotation runbook (practice once on staging)

1.  [ ] Generate a fresh secret: `openssl rand -hex 32`.
2.  [ ] Push to staging Worker:
    ```bash
    cd worker && pnpm exec wrangler secret put PROXY_SECRET
    ```
        (Add `--env staging` if you have a separate staging Worker.)
3.  [ ] Update `~/app-staging/.env` on the VPS — paste new value into
        `PROXY_SECRET=`.
4.  [ ] Apply: `cd ~/app-staging && docker compose up -d`.
5.  [ ] Verify staging lookup still works in the browser.
6.  [ ] Confirm the **old** secret is now rejected:
    ```bash
    curl -i -H "x-proxy-auth: <OLD_VALUE>" \
      "https://<your-worker-slug>.workers.dev/api/character/Alice?worldId=heroic-kronos"
    ```
    Expect `404` (and a `proxy-auth-fail` event in `wrangler tail`).

---

## Out of scope for this review

Deferred deliberately — flagged for a future pass:

- **Worker-level token bucket** (Durable Object / KV-based) keyed on
  cache misses only. Add if Caddy's coarse 30/min/IP proves insufficient
  in telemetry.
- **`localStorage` schema validation on read**. Migration logic in
  `src/persistence/muleMigrate.ts` handles known shapes; no hard runtime
  validation against arbitrary devtools-pasted JSON. Low risk for a
  single-user local-first app.
- **Outbound `characterImgURL` host allowlist in the Worker.** CSP
  `img-src` covers the same ground at the boundary you control.
- **`dangerouslySetInnerHTML` in `src/components/ui/chart.tsx:87`.**
  Reviewed: emits app-controlled CSS variables only, no user input
  reaches it.
- **`npm audit` / dependency hygiene cadence.** Worth a recurring
  weekly review; not gating launch.
- **Sentry / proper APM.** Add when a real user reports an unreproducible
  bug.
