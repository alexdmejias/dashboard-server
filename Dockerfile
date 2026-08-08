# syntax=docker/dockerfile:1

# Selects the runtime target below: "with-puppeteer" (default, self-contained
# with system Chromium) or "without-puppeteer" (slim, external renderer only
# e.g. cloudflare/browserless). Declared here, before the first FROM, so it's
# in global scope and usable by the final `FROM runtime-${INCLUDE_PUPPETEER}`
# stage-selection line further down.
ARG INCLUDE_PUPPETEER=with-puppeteer

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

FROM node:25-bookworm-slim AS runtime-base

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3333 \
    PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./

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

# ---------------------------------------------------------------------------
# Self-contained image: includes puppeteer and system Chromium so the
# puppeteer browser renderer works with no external service. This is the
# default runtime target (see INCLUDE_PUPPETEER below).

FROM runtime-base AS runtime-with-puppeteer

# System Chromium for the puppeteer browser renderer (puppeteer's own bundled
# download is skipped above in favor of this one, via CHROMIUM_BIN).
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_BIN=/usr/bin/chromium

RUN npm ci --omit=dev && npm cache clean --force

# ---------------------------------------------------------------------------
# Slim image: omits puppeteer and system Chromium for deployments that only
# use an external renderer (cloudflare, browserless).

FROM runtime-base AS runtime-without-puppeteer

RUN npm ci --omit=dev --omit=optional && npm cache clean --force

# ---------------------------------------------------------------------------
# Build with --build-arg INCLUDE_PUPPETEER=without-puppeteer to select the
# slim target above instead of the default with-puppeteer one.

FROM runtime-${INCLUDE_PUPPETEER} AS runtime
