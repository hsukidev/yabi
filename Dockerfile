# Stage 1 — build
# Debian-based (not alpine) because Puppeteer's bundled headless Chrome,
# used by scripts/prerender.mjs to capture SSR markup, expects glibc and
# the Chromium runtime libs installed below.
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libasound2 libpango-1.0-0 libcairo2 libcups2 \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:prerender

# Stage 2 — serve
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html

# Place the nginx config as a template — the official nginx image's
# entrypoint runs envsubst over /etc/nginx/templates/*.template at start
# and writes the result to /etc/nginx/conf.d/<basename without .template>.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Restrict envsubst to only substitute deployment-injected vars so nginx's
# own variables ($uri etc.) are left alone.
ENV NGINX_ENVSUBST_FILTER=^(PROXY_SECRET|WORKER_HOST)$

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]