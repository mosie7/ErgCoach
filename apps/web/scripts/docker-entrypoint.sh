#!/bin/sh
set -eu

echo "[ergcoach] starting entrypoint"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[ergcoach] DATABASE_URL is required" >&2
    exit 1
  fi
  echo "[ergcoach] applying Prisma migrations"
  # Prefer local prisma binary from the image
  if [ -x "/app/node_modules/.bin/prisma" ]; then
    /app/node_modules/.bin/prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma
  else
    npx --yes prisma@6.19.3 migrate deploy --schema=/app/packages/database/prisma/schema.prisma
  fi
fi

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  echo "[ergcoach] SEED_ON_BOOT requested — run seed separately in CI/ops for safety"
fi

echo "[ergcoach] launching web server"
exec "$@"
