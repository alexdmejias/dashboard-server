# syntax=docker/dockerfile:1

# Built in its own stage so it's cached independently of the rest of the
# repo. The admin app reaches outside its own directory for a couple of
# shared files (src/plugins/settingsSchema.ts, init-payload.schema.json),
# so those are copied in explicitly rather than the whole repo — this
# reruns when those, or admin/'s own deps/source, change, but not for
# unrelated changes elsewhere (views/, data/, docs, etc).
FROM node:25-bookworm-slim AS admin-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY admin/package*.json ./admin/
RUN cd admin && npm ci

COPY src ./src
COPY init-payload.schema.json ./
COPY admin/ ./admin/
RUN cd admin && npm run build

# ---------------------------------------------------------------------------

FROM node:25-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=admin-builder /app/public/admin ./public/admin

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
