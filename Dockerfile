# syntax=docker/dockerfile:1

FROM node:25-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the admin SPA first; its output (public/admin) is picked up by the
# server build below (build:copy bundles whatever is already in public/).
RUN cd admin && npm ci && npm run build

RUN npm run build

# ---------------------------------------------------------------------------

FROM node:25-bookworm-slim AS runtime

# System Chromium for the puppeteer browser renderer (puppeteer's own bundled
# download is skipped below in favor of this one, via CHROMIUM_BIN).
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3333 \
    CHROMIUM_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Templates/views/static assets are resolved relative to the project root at
# runtime (see src/utils/projectRoot.ts), not relative to dist/, so they all
# need to ship alongside the compiled output.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD sh -c 'curl -fsS "http://localhost:${PORT:-3333}/health" || exit 1'

CMD ["node", "dist/index.js"]
