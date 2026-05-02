# SECURITY.md

Pre-launch security review for `yabi`. Captures the threat
model, the chosen mitigations, and the step-by-step actions to ship before the
app is opened to public users.

## Architecture in one paragraph

Anonymous, single-user, browser-local SPA (state lives in `localStorage` —
no accounts, no backend DB). One Cloudflare Worker endpoint
(`worker/src/worker.ts`) at `GET /api/character/:name?worldId=…` proxies to
Nexon's no-auth ranking API and caches success responses for 6h, 404s for 1h.
The SPA is served from a self-hosted VPS (Docker → Caddy → nginx) fronted by
Cloudflare's free proxy (orange cloud), and `/api/*` is reverse-proxied through
nginx to `*.workers.dev`. The DO Cloud Firewall accepts HTTP/HTTPS only from
Cloudflare's published IP ranges. Avatar URLs from Nexon are rendered directly
into `<img src>` (`src/components/CharacterAvatar.tsx:77`).

## Threat model

Five concerns, in priority order:

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
5. **(e) VPS bandwidth / availability.** Volumetric DDoS or L7 flood saturates
   the droplet's NIC or burns through DigitalOcean's bandwidth allowance,
   racking up overage charges or knocking the SPA offline. Caddy's rate limit
   (decision 1) catches abusive request patterns but only after bytes have
   already crossed the NIC.

Decisions 1–6 collapse (a), (b), (c) together; (d) is one extra header.
(e) is handled separately by decision 7 (Cloudflare proxy in front of the SPA

- origin firewall lockdown).

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
User-Agent: yabi/1.0 (+https://github.com/hsukidev/yabi)
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

### 7. Cloudflare proxy in front of the SPA + origin IP lockdown

**Concern.** Caddy's 30/min/IP rate limit (decision 1) catches abusive
patterns but does so after the bytes have already crossed the droplet's
NIC and counted against DigitalOcean's bandwidth allowance. A volumetric
flood — L3/L4 SYN flood, or 10k IPs each hitting just under the 30/min
threshold — would saturate the network interface and rack up overage
charges before Caddy ever returns a 429. The Worker-side mitigations
don't help: the bottleneck is the VPS itself.

**Decision.** Front the SPA with Cloudflare's free proxy (orange cloud)
on both `yabi.henesys.io` and `snow-yeti.henesys.io`, configure Caddy
to trust Cloudflare as a proxy so `{client_ip}` resolves to the real
visitor, and lock the DO Cloud Firewall to accept HTTP/HTTPS only from
Cloudflare's published IP ranges. Automate monthly refresh of the
firewall's CF range list via GitHub Actions.

**Why this layer.** Cloudflare's edge absorbs L3/L4 and L7 DDoS at no
cost on the free tier — bytes never reach the droplet, never count
against DO bandwidth, and never saturate the NIC. Static SPA assets are
also cached at the edge, so legitimate traffic to the origin drops
sharply.

**Why also lock the origin firewall.** Without it, attackers can find
the droplet's IP through historical DNS, certificate transparency logs,
or simple Censys-style scans, and hit the origin directly. The DO
firewall enforces "Cloudflare is the only path in," making the proxy
genuinely unbypassable.

**Why `trusted_proxies cloudflare` over a static IP list in Caddy.**
The `caddy-cloudflare-ip` module auto-fetches Cloudflare's published
ranges every 12h. A static list drifts silently; the module refreshes
continuously inside the long-running process and does not need its own
cron.

**Why automate the firewall refresh from GitHub Actions, not the VPS.**
Putting a DO API token on the VPS expands the blast radius of a droplet
compromise (token can disable the firewall). GHA keeps the token in
GitHub Secrets, runs in an ephemeral runner, and emails on failure. The
script's empty-list guard refuses to push if the Cloudflare fetch
returns nothing, preventing a silent zeroing of the allowlist.

**Why monthly cadence.** Cloudflare's IP ranges change rarely (years
between updates). Daily would be free and harmless; monthly is enough
given the change frequency. If Cloudflare publishes a new range,
worst-case staleness is ~30 days of new visitors briefly hitting a
firewall block — acceptable for this app's threat profile.

**What this won't do.** Doesn't protect against an attack that targets
Cloudflare itself, or one that shapes traffic to evade the free-tier
WAF defaults (rules-based, not behavioral). Sufficient for a low-value,
non-contested target; revisit if real abuse is observed in telemetry.

### 8. Tailscale for deploy-time SSH access

**Concern.** Decision 7d narrowed the DO firewall's port 22 to your home
IP only. The existing GHA deploy job (`.github/workflows/ci-cd.yaml`)
uses `appleboy/ssh-action` to SSH into the droplet from a runner with a
rotating Azure IP — now blocked. Without a fix, every push to
`deploy-prod` / `deploy-staging` fails at the deploy step.

**Decision.** Add the droplet to a Tailscale tailnet. The GHA workflow
joins the same tailnet ephemerally via an OAuth-tagged auth key, then
SSHes over the tailnet using its existing key. Public port 22 stays
restricted to the home IP for break-glass.

**Why Tailscale over alternatives.**

- **Allowlisting GHA IPs.** Strictly worse than no firewall at all —
  you'd be opening port 22 to thousands of shared Azure CIDRs that every
  GHA user worldwide can launch jobs from.
- **Self-hosted GHA runner on the droplet.** Works with zero firewall
  changes, but adds an always-on runner process and a new attack vector:
  a compromised repo/workflow runs arbitrary commands as the runner
  user.
- **Pull-based webhook deploy.** Cleanest architecturally — no inbound
  deploy access at all — but the most code to write and maintain.
  Deferred for now.
- **Tailscale.** ~15-min setup, no inbound port needed (WireGuard NAT
  traversal or DERP relay), authenticated by tailnet identity, free
  Personal plan up to 100 devices.

**Why ephemeral OAuth-tagged auth keys vs a static auth key.** Static
keys persist if leaked (e.g., committed accidentally, scraped from a
build log). The OAuth-client + `tag:ci` pattern mints fresh credentials
per job, scoped to a single tag, expiring when the runner exits.

**Why keep public port 22 (home IP) instead of removing it entirely.**
Break-glass. If Tailscale ever has an outage that coincides with you
needing direct droplet access, the home-IP rule is your fallback. DO's
web-based recovery console covers the worst case, but having SSH still
available avoids a forced reboot.

**What this won't do.** A compromised GitHub repo or workflow can still
trigger the deploy and gain shell on the droplet. Mitigations live
outside this decision: branch protection on `deploy-prod` /
`deploy-staging`, required PR review on changes to those branches,
limiting which collaborators can push there.

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
   yabi.henesys.io {
       @api path /api/*
       rate_limit @api {
           zone api_per_ip { key {client.ip}; events 30; window 1m }
       }
       reverse_proxy yabi:80
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
       https://yabi.henesys.io/api/character/AliceK?worldId=heroic-kronos
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
       `https://yabi.henesys.io`.

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
     "https://yabi.henesys.io/api/character/x?worldId=heroic-kronos"
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
   curl -I https://yabi.henesys.io/ | grep -iE \
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
  (`yabi/1.0 (+https://github.com/hsukidev/yabi)`)
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
   (Use distinct filenames per site, e.g. `yabi-access.log` and
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
   docker compose exec caddy tail /var/log/caddy/yabi-access.log
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

### 7. Cloudflare proxy + origin lockdown

#### 7a. Cloudflare zone setup (proxy off)

**Code.** None — Cloudflare configuration is runtime-only.

**Runtime:**

1. [ ] Cloudflare dashboard → **Add a Site** → enter `henesys.io` → choose
       **Free** plan.
2. [ ] Audit imported DNS records: confirm `yabi` and `snow-yeti` A records
       point to the droplet IP, and any MX / TXT records you already had are
       present.
3. [ ] For every record, click the orange cloud → set to grey (DNS only).
       The proxy stays off until 7c.
4. [ ] Update nameservers at the registrar to the two Cloudflare nameservers
       shown.
5. [ ] Wait for `Status: Active` email (usually <1h, can be up to 24h).
6. [ ] Sanity-check: `curl -I https://yabi.henesys.io/` should respond
       exactly as before (no `cf-ray` header yet — that arrives in 7c).

### 7b. Caddy custom build with `caddy-cloudflare-ip`

**Code.** None — Caddy build & config are runtime-only on the VPS.

**Runtime (on VPS, in `~/app/`):**

1. [ ] Add the Cloudflare-IP module to `~/app/caddy/Dockerfile`:

   ```dockerfile
   FROM caddy:builder AS builder
   RUN xcaddy build \
       --with github.com/mholt/caddy-ratelimit \
       --with github.com/WeidiDeng/caddy-cloudflare-ip

   FROM caddy:latest
   COPY --from=builder /usr/bin/caddy /usr/bin/caddy
   ```

   Verify line continuations: `cat -A ~/app/caddy/Dockerfile` — every
   continuation line must end in ` \$`. A `\` mid-line silently drops the
   second `--with` and the cloudflare-ip module never gets compiled in.

2. [ ] Update `~/app/Caddyfile` — add a global `servers` block at the top,
       and change `{client.ip}` to `{client_ip}` (the underscore form is the
       canonical placeholder that respects `trusted_proxies`). End state below
       includes the log blocks from 6b for completeness:

   ```caddyfile
   # Cloudflare Proxy send client ip to caddy
   {
       servers {
           trusted_proxies cloudflare {
               interval 12h
               timeout 15s
           }
           client_ip_headers CF-Connecting-IP X-Forwarded-For
       }
   }

   # Production Site
   yabi.henesys.io {
       log {
           output file /var/log/caddy/yabi-access.log {
               roll_size 10MiB
               roll_keep 5
               roll_keep_for 720h
           }
           format json
       }

       @api path /api/*
       rate_limit @api {
           zone api_per_ip {
               key {client_ip}
               events 30
               window 1m
           }
       }
       reverse_proxy yabi:80
   }

   # Staging Site
   snow-yeti.henesys.io {
       log {
           output file /var/log/caddy/snow-yeti-access.log {
               roll_size 10MiB
               roll_keep 5
               roll_keep_for 720h
           }
           format json
       }

       @api path /api/*
       rate_limit @api {
           zone api_per_ip_staging {
               key {client_ip}
               events 30
               window 1m
           }
       }
       reverse_proxy snow-yeti:80
   }
   ```

3. [ ] Rebuild without cache and verify the module is in the binary:

   ```bash
   docker compose build --no-cache caddy
   docker compose run --rm caddy caddy list-modules | grep -iE 'rate_limit|cloudflare'
   ```

   Expect both `http.handlers.rate_limit` and `http.ip_sources.cloudflare`.
   If `cloudflare` is missing, the build did not pick up the module — check
   the Dockerfile line continuations before continuing.

4. [ ] Validate the Caddyfile:

   ```bash
   docker compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile
   ```

5. [ ] Apply: `docker compose up -d caddy`.

### 7c. Flip proxy ON — staging first, then production

**Code.** None.

**Runtime:**

1. [ ] Cloudflare dashboard → **SSL/TLS → Overview** → set mode to
       **Full (strict)**. Anything looser causes a redirect loop or downgrades
       the origin hop to plaintext.
2. [ ] Cloudflare dashboard → **SSL/TLS → Edge Certificates** → enable
       **Always Use HTTPS** and set **Minimum TLS Version: 1.2**.
3. [ ] DNS tab → click the grey cloud next to `snow-yeti` → it turns orange.
       (Repeat for `yabi` once staging is verified — see step 7 below.)
4. [ ] Verify staging is now proxied (run from a non-VPS machine):

   ```bash
   curl -I https://snow-yeti.henesys.io/
   ```

   Expect `server: cloudflare` and a `cf-ray:` header in the response.

5. [ ] Verify the rate limit still buckets per real client IP:

   ```bash
   for i in $(seq 1 50); do curl -s -o /dev/null -w "%{http_code} " "https://snow-yeti.henesys.io/api/character/AliceK?worldId=heroic-kronos"; done; echo
   ```

   Expect ~30 successes (200 or 404) followed by 429s. **No 429s at all
   means `trusted_proxies` isn't picking up the real client IP — every
   request is bucketed under one CF edge IP. Roll back to grey cloud and
   debug 7b before proceeding.**

6. [ ] Verify Caddy logs record real client IPs (not Cloudflare's
       `104.16.x.x` ranges):

   ```bash
   docker compose exec caddy tail -n 5 /var/log/caddy/snow-yeti-access.log | jq .request.remote_ip
   ```

7. [ ] Once staging has been healthy for a few minutes, repeat step 3 for
       `yabi` (production). Re-run the curl checks against
       `yabi.henesys.io`. Click through the deployed app with DevTools
       Network tab open and confirm `/api/*` calls succeed and show
       `cf-ray` headers.

**Rollback.** Click the orange cloud back to grey in Cloudflare DNS. Effective
in seconds.

### 7d. Origin firewall lockdown

**Code.** None — DO firewall is runtime-only.

**Runtime:**

1. [ ] DO dashboard → **Networking → Firewalls → Create Firewall**.
       Inbound rules:

   | Type  | Protocol | Port | Sources                            |
   | ----- | -------- | ---- | ---------------------------------- |
   | HTTP  | TCP      | 80   | Cloudflare IPv4 + IPv6 ranges      |
   | HTTPS | TCP      | 443  | Cloudflare IPv4 + IPv6 ranges      |
   | SSH   | TCP      | 22   | Your home IP (or VPN exit IP) only |

   Source IP lists live at <https://www.cloudflare.com/ips-v4/> and
   <https://www.cloudflare.com/ips-v6/>.

2. [ ] Outbound rules: leave at default (all).
3. [ ] Apply the firewall to the droplet.
4. [ ] Verify direct origin access is now blocked. From a non-Cloudflare
       machine:

   ```bash
   curl -v --resolve yabi.henesys.io:443:<DROPLET_IP> https://yabi.henesys.io/
   ```

   Expect timeout or connection refused. If a response comes back, the
   firewall isn't applied correctly — fix before continuing.

5. [ ] Verify the proxied path still works:

   ```bash
   curl -I https://yabi.henesys.io/
   ```

### 7e. Automated Cloudflare-IP refresh

**Code.** Committed in `cf5a145` (initial script + GHA workflow) and
`9ce39bb` (switched to `api.cloudflare.com/client/v4/ips` after the docs
URL began 403'ing CI runners). Diagnostic and safety follow-ups in
`fe37dd1`, `67e0159`.

- `scripts/refresh-cf-firewall.sh` — fetches Cloudflare's published IPv4 +
  IPv6 ranges from `api.cloudflare.com/client/v4/ips` (the purpose-built
  programmatic endpoint — the docs URL `cloudflare.com/ips-v4` sits behind
  bot management and 403s CI runners), GETs the current DO firewall config,
  replaces `sources.addresses` on TCP port 80/443 rules with the fresh list,
  and PUTs the updated firewall. SSH (port 22) and any other rules are
  untouched. Empty-list and `success != true` guards refuse to push if the
  Cloudflare fetch returns unexpected data (would otherwise zero the
  allowlist and lock the firewall closed for HTTP/HTTPS). A second
  defensive guard refuses to push if the GET returns empty `droplet_ids`
  and `tags` — typically a sign the token lacks `droplet:read` and DO has
  redacted the response, which if PUT back would detach the firewall from
  the droplet. Set `FORCE_EMPTY_ATTACHMENT=1` to bypass for genuinely
  unattached firewalls.
- `.github/workflows/refresh-cf-firewall.yml` — runs the script monthly via
  cron (`0 4 1 * *`) and on `workflow_dispatch`. `DO_TOKEN` and
  `DO_FIREWALL_ID` come from GitHub Secrets, never touch the VPS.

**Runtime:**

1. [ ] Generate a DO Personal Access Token: DigitalOcean dashboard →
       **API → Tokens → Generate New Token**. Custom scopes:
       `firewall:read`, `firewall:update`, **and** `droplet:read`.
       The `droplet:read` scope is required even when the firewall has
       no droplets attached — DO's `firewall:update` validates against
       droplet ownership preemptively, returning 403 with
       `"Following additional permisisions are needed droplet:read"`
       if it's missing.
2. [ ] Look up the firewall ID:

   ```bash
   curl -fsSL -H "Authorization: Bearer <TOKEN>" \
     https://api.digitalocean.com/v2/firewalls | jq '.firewalls[] | {id, name}'
   ```

3. [ ] GitHub repo → **Settings → Secrets and variables → Actions** → add:
   - `DO_TOKEN` = the API token
   - `DO_FIREWALL_ID` = the firewall ID
4. [ ] Smoke-test the workflow manually: GitHub → **Actions → Refresh
       Cloudflare IPs in DO firewall → Run workflow**. Final log line should
       read `Firewall <id> updated with <N> Cloudflare ranges`.
5. [ ] DO dashboard → confirm the firewall's HTTP/HTTPS rules still show the
       expected number of source CIDRs.
6. [ ] GitHub → profile → **Settings → Notifications → Actions** → ensure
       failed-workflow notifications are enabled. Silent failure is the
       dangerous mode here — a stale list drifts further every month it
       isn't caught.

### 8. Tailscale for deploy-time SSH access

#### 8a. Install Tailscale on the droplet

**Code.** None — runtime-only on the VPS.

**Runtime (SSH from home — port 22 still open to your home IP):**

1. [ ] Install Tailscale:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. [ ] Bring it up (without tags first — the tag doesn't exist in your
       tailnet yet):

   ```bash
   sudo tailscale up --hostname=yabi-vps
   ```

   Open the printed URL in a browser, log in to Tailscale, authorize
   the device.

   **Do not pass `--ssh`.** That flag enables Tailscale SSH, which
   intercepts tailnet SSH connections and authenticates by tailnet
   identity instead of SSH keys. The GHA `appleboy/ssh-action` uses
   standard SSH key auth, which Tailscale SSH closes mid-handshake
   (`ssh: handshake failed: EOF`). With Tailscale SSH off, plain
   `sshd` handles the connection normally over the tailnet.

3. [ ] Verify and note the tailnet IP:

   ```bash
   tailscale status
   tailscale ip -4
   ```

#### 8b. Tailscale ACL + OAuth client

**Code.** None — Tailscale admin configuration only.

**Runtime (in <https://login.tailscale.com/admin>):**

1. [ ] **Access Controls → Edit policy file** — add `tag:ci` and
       `tag:server`, plus an ACL allowing CI runners to SSH to tagged
       servers:

   ```hujson
   {
     "tagOwners": {
       "tag:ci": ["autogroup:admin"],
       "tag:server": ["autogroup:admin"],
     },
     "acls": [
       // your existing personal-device rule (keep what's there)
       { "action": "accept", "src": ["autogroup:member"], "dst": ["*:*"] },

       // CI runners can SSH to tagged servers
       { "action": "accept", "src": ["tag:ci"], "dst": ["tag:server:22"] },
     ],
     "ssh": [
       { "action": "accept", "src": ["autogroup:member"], "dst": ["autogroup:self"], "users": ["autogroup:nonroot", "root"] },
     ],
   }
   ```

   Save.

2. [ ] On the droplet, re-run `tailscale up` with the tag now that
       `tag:server` exists:

   ```bash
   sudo tailscale up --hostname=yabi-vps --advertise-tags=tag:server
   ```

3. [ ] **Settings → OAuth clients → Generate OAuth client**:
   - Description: `gha-deploy`
   - Scopes: **Auth Keys** (read + write)
   - Tags: `tag:ci`
   - Generate → copy the client ID and secret. **The secret is shown
     once.**

#### 8c. Update GHA workflow + secrets

**Code.** Committed in `b1421c3` (Tailscale step added to the `deploy`
job; SSH host resolved via Tailscale MagicDNS).

- `.github/workflows/ci-cd.yaml` — adds a `Tailscale` step
  (`tailscale/github-action@v2`) before the SSH step in the `deploy`
  job; SSH host now resolved via Tailscale MagicDNS.

**Runtime:**

1. [ ] GitHub repo → **Settings → Secrets and variables → Actions** →
       add:
   - `TS_OAUTH_CLIENT_ID` = the OAuth client ID from 8b
   - `TS_OAUTH_SECRET` = the OAuth secret from 8b
2. [ ] Update existing secret `VPS_HOST` from the droplet's public IP to
       `yabi-vps` (the MagicDNS hostname).
3. [ ] Smoke-test by pushing an empty commit to `deploy-staging`:

   ```bash
   git checkout deploy-staging
   git commit --allow-empty -m "test: verify tailscale deploy path"
   git push origin deploy-staging
   ```

   Watch the run. Expect the `Tailscale` step to log `Auth complete`
   plus a `100.x.y.z` IP, then `SSH and redeploy` to connect and run
   the deploy script as before.

4. [ ] Once staging is green, merge / push to `deploy-prod` and confirm
       the same path works for production.

#### 8d. DO firewall: no change

**Code / Runtime.** None — Tailscale traffic doesn't traverse public
port 22 (rides over WireGuard with NAT traversal, or DERP relay as
fallback). The home-IP SSH rule from 7d stays in place as break-glass.

If you ever decide to go fully Tailscale-only, the procedure is: delete
the SSH inbound rule from the DO firewall. DigitalOcean's web recovery
console handles the worst case if Tailscale itself is unreachable.

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
- **Cloudflare edge rate limiting on `/api/*`.** Free-tier WAF allows one
  rate-limit rule with 10k/month evaluations. Caddy's per-IP rate limit
  (decision 1) is enforced at the application layer with the real client
  IP and is sufficient given the threat profile. Revisit if telemetry
  shows attack patterns evading Caddy's coarse 30/min/IP bucket.
