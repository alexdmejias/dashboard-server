#!/usr/bin/env bash
# Runs the visual tests inside the Playwright Docker image that CI uses, so
# reference screenshots match CI pixel for pixel. Extra arguments go to vitest,
# e.g. `-u` to update references.
#
# Always x86_64 (CI's architecture): font rasterization can differ on arm64,
# so on Apple Silicon or a Raspberry Pi this runs under emulation and is slower.
set -euo pipefail
cd "$(dirname "$0")/../.."

version=$(node -p "require('./package.json').devDependencies.playwright")
image="mcr.microsoft.com/playwright:v${version}-noble"

docker run --rm --platform linux/amd64 --ipc=host \
  -v "$PWD":/work \
  -v dashboard-server-visual-node-modules:/work/node_modules \
  -w /work \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  "$image" bash -c '
    set -e
    trap "chown -R \$HOST_UID:\$HOST_GID public src .vitest-attachments 2>/dev/null || true" EXIT
    npm ci --no-audit --no-fund --loglevel=error
    npm run build:css --silent
    npx vitest run --project visual "$@"
  ' visual-tests "$@"
