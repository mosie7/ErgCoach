# ErgCoach production image — Next.js standalone + Prisma
# Build: docker build -t ergcoach-web .
# Run:   docker run -p 3000:3000 --env-file .env ergcoach-web

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/mcp-server/package.json apps/mcp-server/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY packages/training-engine/package.json packages/training-engine/
COPY packages/concept2/package.json packages/concept2/
COPY packages/ai-coach/package.json packages/ai-coach/
COPY packages/billing/package.json packages/billing/
COPY packages/services/package.json packages/services/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Prisma needs a placeholder URL at generate time
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN pnpm --filter @ergcoach/shared build \
  && pnpm --filter @ergcoach/training-engine build \
  && pnpm --filter @ergcoach/concept2 build \
  && pnpm --filter @ergcoach/ai-coach build \
  && pnpm --filter @ergcoach/database generate \
  && pnpm --filter @ergcoach/database exec tsc -p tsconfig.json \
  && pnpm --filter @ergcoach/billing build \
  && pnpm --filter @ergcoach/services build \
  && pnpm --filter @ergcoach/web build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone Next.js server
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Prisma schema + migrations + engines for runtime migrate
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules

COPY --chown=nextjs:nodejs apps/web/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
