# Full Deployment Guide: React App on a 512 MB VPS

## Overview

**Architecture:** GitHub Actions builds a Docker image → pushes to Docker Hub → VPS pulls and runs it behind Caddy (reverse proxy with automatic HTTPS) → Cloudflare proxy fronts the public hostnames.

**Stack:** React + Vite → Docker (nginx:alpine) → Docker Hub → DigitalOcean Droplet → Caddy → Cloudflare

**Environments:** `yabi.henesys.io` (production) and `snow-yeti.henesys.io` (staging)

**VPS layout** (the droplet has **two separate app directories** that operate independently):

- `~/app/` — production app **and** the Caddy edge. Contains the Caddyfile, custom-built Caddy image (`./caddy/Dockerfile` adds `caddy-ratelimit` + `caddy-cloudflare-ip` xcaddy modules), prod `docker-compose.yml`, and `.env` (`PROXY_SECRET`, `WORKER_HOST`).
- `~/app-staging/` — staging app only. Contains a `docker-compose.yml` that joins the same external `proxy-network` Caddy uses. No Caddy here — prod's Caddyfile handles `snow-yeti.henesys.io` via the shared proxy network.

The security posture (rate limiting, Cloudflare proxy, origin firewall, Tailscale-for-deploy-SSH, log persistence, Worker shared-secret gate) is documented in detail in [SECURITY.md](./SECURITY.md). This guide covers the _deployment shape_; SECURITY.md covers the _why_ and the runtime hardening checklists.

---

## Part 1 — Domain & DNS

In your domain registrar dashboard (Namecheap, GoDaddy, etc.), create two A records pointing to your droplet's IP:

| Type | Host/Name   | Value               |
| ---- | ----------- | ------------------- |
| A    | `yabi`      | `<your-droplet-ip>` |
| A    | `snow-yeti` | `<your-droplet-ip>` |

DNS propagation can take up to 48 hours, but usually resolves within minutes. Check progress at [dnschecker.org](https://dnschecker.org).

Once Cloudflare is fronting the zone, the proxy (orange cloud) gets enabled on these records — see [SECURITY.md decision 7](./SECURITY.md#7-cloudflare-proxy-in-front-of-the-spa--origin-ip-lockdown) for the full edge-hardening flow.

---

## Part 2 — VPS Initial Setup & Hardening

SSH in as root, then run the following in order.

### 1. Create a Non-Root User

Avoid working as root for daily tasks — it's a safety net against accidental destructive commands.

```bash
adduser devuser
usermod -aG sudo devuser
rsync --archive --chown=devuser:devuser ~/.ssh /home/devuser
```

Log out, then log back in as `devuser`:

```bash
ssh devuser@<your-droplet-ip>
```

### 2. Lock Down the Firewall (UFW)

DigitalOcean Droplets are wide open by default. Close everything except what Caddy and SSH need.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> **Note on Docker:** Docker bypasses UFW by default. Since your app containers only talk to Caddy internally (no ports exposed directly to the internet), they are not at risk — but keep this in mind if you ever expose additional ports as you scale.

> **Note on the DO cloud firewall:** The UFW rules above are the _droplet-level_ firewall. There is a separate _DigitalOcean cloud firewall_ (per [SECURITY.md decision 7d](./SECURITY.md#7d-origin-firewall-lockdown)) that locks port 80/443 to Cloudflare's published IPs and port 22 to your home IP — that one shadows UFW and is what actually keeps the origin private once Cloudflare is fronting the site.

### 3. Add a 1 GB Swap File

Critical for 512 MB RAM — prevents OOM (Out of Memory) crashes if there's any memory spike.

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose-v2 -y
sudo usermod -aG docker $USER
```

Log out and back in again so the `docker` group takes effect.

---

## Part 3 — Project Files (in your repo)

**`Dockerfile`** — multi-stage build: Node builds the app (with the prerender pass per [SEO.md decision 7](./SEO.md)), nginx serves it. Builder stage uses `node:22-bookworm-slim` because the prerender pass runs Puppeteer/Chromium and Alpine doesn't ship the required glibc + X11/NSS libs. The runner stage stays on `nginx:alpine` so the served image stays small.

**`nginx.conf.template`** — SPA routing fallback, gzip, security headers, and the Worker proxy gate (`X-Proxy-Auth: ${PROXY_SECRET}` → `${WORKER_HOST}`). The full header set and rationale live in [SECURITY.md decisions 2 + 4](./SECURITY.md#2-lock-the-worker-behind-a-shared-secret-header).

**`.dockerignore`** — keeps build context small:

```
node_modules
.git
.github
dist
.claude
*.md
```

---

## Part 4 — GitHub Actions CI/CD

The workflow at `.github/workflows/ci-cd.yaml` runs three jobs sequentially: lint+test → docker build+push → SSH-deploy via Tailscale. The Tailscale step exists because the DO cloud firewall restricts port 22 to your home IP only (per [SECURITY.md decision 8](./SECURITY.md#8-tailscale-for-deploy-time-ssh-access)) — the GHA runner joins the tailnet ephemerally with an OAuth-tagged auth key, then SSHes via Tailscale MagicDNS.

The deploy job picks the dir based on the branch:

```yaml
- name: Set deploy directory
  id: vars
  run: |
    if [ "${{ github.ref_name }}" = "deploy-prod" ]; then
      echo "dir=app" >> $GITHUB_OUTPUT
    else
      echo "dir=app-staging" >> $GITHUB_OUTPUT
    fi
…
script: |
  cd ~/${{ steps.vars.outputs.dir }}
  docker compose down
  docker compose pull
  docker compose up -d
```

Image tags pushed to Docker Hub:

- `<DOCKERHUB_USERNAME>/yabi:latest` (on `deploy-prod`)
- `<DOCKERHUB_USERNAME>/yabi:staging` (on `deploy-staging`)
- `<DOCKERHUB_USERNAME>/yabi:<git-sha>` (every push, for SHA-pin rollback)

**Required GitHub secrets** (Settings → Secrets and variables → Actions):

| Secret name          | Value                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Your Docker Hub username                                                                                |
| `DOCKERHUB_TOKEN`    | Docker Hub Personal Access Token (Account Settings → Personal access tokens)                            |
| `VPS_HOST`           | Tailscale MagicDNS hostname (e.g., `yabi-vps`) — **not** the public IP, since port 22 is firewalled     |
| `VPS_USER`           | `devuser`                                                                                               |
| `VPS_SSH_KEY`        | Contents of your CI SSH private key (see Part 4a)                                                       |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID — see [SECURITY.md decision 8b](./SECURITY.md#8b-tailscale-acl--oauth-client) |
| `TS_OAUTH_SECRET`    | Tailscale OAuth secret                                                                                  |

### Part 4a — SSH Key Setup for CI

Generate a dedicated key pair for GitHub Actions (do this on your local machine):

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
```

Copy the public key to your droplet:

```bash
ssh-copy-id -i ~/.ssh/github_actions.pub devuser@<your-droplet-ip>
```

Add the private key as the `VPS_SSH_KEY` secret — copy the full output of `cat ~/.ssh/github_actions` (including the `-----BEGIN` and `-----END` lines).

---

## Part 5 — VPS Deployment Files

The droplet has two separate app directories. Caddy lives in the prod dir and reverse-proxies to both prod and staging containers via a shared external Docker network (`proxy-network`).

### One-time setup: shared docker network

Both compose files reference `proxy-network` as `external: true`. Create it once on the droplet:

```bash
docker network create proxy-network
```

### `~/app/` — production + Caddy edge

```bash
mkdir ~/app && cd ~/app
```

**`~/app/docker-compose.yml`:**

```yaml
services:
  caddy:
    build:
      context: ./caddy
    image: caddy-with-ratelimit:latest
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - caddy_logs:/var/log/caddy
    networks:
      - proxy-network

  yabi:
    image: <DOCKERHUB_USERNAME>/yabi:latest
    restart: unless-stopped
    networks:
      - proxy-network
    environment:
      - PROXY_SECRET=${PROXY_SECRET}
      - WORKER_HOST=${WORKER_HOST}
    deploy:
      resources:
        limits:
          memory: 64M

networks:
  proxy-network:
    external: true

volumes:
  caddy_data:
  caddy_config:
  caddy_logs:
```

**`~/app/caddy/Dockerfile`** (custom xcaddy build — see [SECURITY.md decisions 1 + 7b](./SECURITY.md#7b-caddy-custom-build-with-caddy-cloudflare-ip) for why both modules are needed):

```dockerfile
FROM caddy:builder AS builder
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/WeidiDeng/caddy-cloudflare-ip

FROM caddy:latest
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

**`~/app/Caddyfile`** — handles both prod and staging hostnames; per-block details (rate-limit zones, log persistence, Cloudflare trusted_proxies) are documented in SECURITY.md (decisions [1](./SECURITY.md#1-rate-limit-at-caddy-on-the-vps), [6b](./SECURITY.md#6b-caddy-access-logs-persisted), [7b](./SECURITY.md#7b-caddy-custom-build-with-caddy-cloudflare-ip)):

```
# Cloudflare Proxy: trust CF, recover real client IP
{
    servers {
        trusted_proxies cloudflare {
            interval 12h
            timeout 15s
        }
        client_ip_headers CF-Connecting-IP X-Forwarded-For
    }
}

# Production
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

# Staging
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

**`~/app/.env`** (chmod 600 — never committed, never logged):

```
PROXY_SECRET=<64-char hex from `openssl rand -hex 32`; must match `wrangler secret put PROXY_SECRET`>
WORKER_HOST=<your-worker-slug>.workers.dev
```

> **Container DNS:** The names `yabi` and `snow-yeti` in the Caddyfile must exactly match the service names in their respective compose files. Docker handles the internal DNS automatically across the shared `proxy-network`.

> **Caddy + Let's Encrypt:** Caddy provisions and renews TLS certs automatically. The `caddy_data` volume persists them — don't remove it or you may hit LE rate limits.

### `~/app-staging/` — staging only

```bash
mkdir ~/app-staging && cd ~/app-staging
```

**`~/app-staging/docker-compose.yml`:**

```yaml
services:
  snow-yeti:
    image: <DOCKERHUB_USERNAME>/yabi:staging
    restart: unless-stopped
    networks:
      - proxy-network
    environment:
      - PROXY_SECRET=${PROXY_SECRET}
      - WORKER_HOST=${WORKER_HOST}
    deploy:
      resources:
        limits:
          memory: 64M

networks:
  proxy-network:
    external: true
```

**`~/app-staging/.env`** (chmod 600):

```
PROXY_SECRET=<64-char hex; same as prod, or a separate staging secret if you've split the Worker between envs>
WORKER_HOST=<your-worker-slug>.workers.dev
```

---

## Part 6 — First Deployment

On the droplet:

```bash
docker network create proxy-network        # one-time, see Part 5

cd ~/app
docker compose down
docker compose pull
docker compose up -d

cd ~/app-staging
docker compose down
docker compose pull
docker compose up -d
```

Check everything is running:

```bash
docker compose ps                          # in each dir
docker compose logs -f                     # follow Caddy + app logs in ~/app/
```

For the Cloudflare proxy enablement, origin firewall lockdown, and Tailscale auth key flow, work through the [SECURITY.md action checklist](./SECURITY.md#action-checklist) (decisions 7 and 8) — those steps are runtime-only and don't live in this guide.

---

## Part 7 — Ongoing Workflow

Deployments are triggered by pushing to dedicated deploy branches.

| Branch           | Docker tag | Environment          | VPS dir          |
| ---------------- | ---------- | -------------------- | ---------------- |
| `deploy-prod`    | `:latest`  | yabi.henesys.io      | `~/app/`         |
| `deploy-staging` | `:staging` | snow-yeti.henesys.io | `~/app-staging/` |

**To deploy to production:**

```bash
git checkout deploy-prod
git merge main
git push origin deploy-prod
```

**To deploy to staging:**

```bash
git checkout deploy-staging
git merge main
git push origin deploy-staging
```

When you push to either branch, GitHub Actions will automatically:

1. Run lint + tests
2. Build the Docker image and push it to Docker Hub with the appropriate tag + `<git-sha>`
3. Join the Tailscale tailnet via the OAuth client, then SSH the droplet via MagicDNS
4. `cd ~/app` (or `~/app-staging`) → `docker compose down && pull && up -d`

No manual steps required after pushing.

---

## Quick Reference

| What                  | Where                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| CI/CD logs            | github.com → your repo → Actions tab                                                                    |
| Docker images         | hub.docker.com → `<DOCKERHUB_USERNAME>/yabi`                                                            |
| Live app              | https://yabi.henesys.io                                                                                 |
| Staging app           | https://snow-yeti.henesys.io                                                                            |
| Prod VPS files        | `~/app/` on the droplet                                                                                 |
| Staging VPS files     | `~/app-staging/` on the droplet                                                                         |
| Check containers      | `docker compose ps` (in each dir)                                                                       |
| View Caddy logs       | `docker compose exec caddy tail -f /var/log/caddy/yabi-access.log`                                      |
| View app logs         | `docker compose logs -f` (run inside the relevant dir)                                                  |
| Worker tail           | `cd worker && pnpm exec wrangler tail`                                                                  |
| Rollback to a SHA     | edit the compose file's `image:` to `<user>/yabi:<sha>` → `docker compose up -d`                        |
| Rotate `PROXY_SECRET` | runbook in [SECURITY.md decision 6d](./SECURITY.md#6d-secret-rotation-runbook-practice-once-on-staging) |
