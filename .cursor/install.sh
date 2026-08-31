#!/usr/bin/env bash
set -euo pipefail

# Idempotent Cloud Agent setup for Trackr.
# Safe to re-run: dependency install is frozen, secret generation is guarded,
# and D1 migrations track their own applied state.

cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
corepack pnpm install --frozen-lockfile

# Local dev secrets. .dev.vars is gitignored, so generate one if it is absent.
# This is a throwaway local development secret, never a production credential.
if [ ! -f .dev.vars ]; then
  echo "==> Generating local .dev.vars"
  SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  {
    echo "BETTER_AUTH_SECRET=${SECRET}"
    echo "BETTER_AUTH_URL=http://localhost:5173"
  } > .dev.vars
fi

echo "==> Applying local D1 migrations"
corepack pnpm run db:migrate:local

echo "==> Setup complete"
