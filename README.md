# ErgCoach

AI-powered Concept2 coaching. Objective metrics are calculated in app code; AI interprets them in context of your goal and history.

## Quick start

```bash
pnpm install
cp .env.example .env
# set DATABASE_URL, OPENAI_API_KEY, CONCEPT2_CLIENT_ID, CONCEPT2_CLIENT_SECRET

docker compose up -d postgres   # or your Postgres
pnpm db:migrate:dev
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → **Get started** → create your account → **Programs** (2k / 5k / 10k / half / marathon / 100k) → **Connect Concept2**.

## Concept2 (your Logbook)

1. Register an app at [Concept2 Logbook developers](https://log.concept2.com/developers)
2. Redirect URI: `http://localhost:3000/api/concept2/callback` (or your production URL)
3. Set in `.env`:

```
CONCEPT2_CLIENT_ID=...
CONCEPT2_CLIENT_SECRET=...
CONCEPT2_REDIRECT_URI=http://localhost:3000/api/concept2/callback
CONCEPT2_USE_MOCK=false
```

4. Sign in → **Settings** → **Connect Concept2** → **Sync workouts**

Each user connects **their own** Logbook. Tokens are stored per account (`DataConnection`).

## Auth

Email/password signup creates a user + athlete profile + Free subscription.  
Architecture supports swapping to Cognito/Auth0/Clerk later.

## Subscriptions (Stripe)

| Plan | Access |
|------|--------|
| Free | Logging, metrics, dashboard |
| Pro | + AI coach chat, AI workout reports, AI weekly review |

See `.env.example` for Stripe keys. Webhook: `POST /api/billing/webhook`.

## Deploy to AWS

See [`infra/README.md`](./infra/README.md) and `./scripts/aws-bootstrap.sh`.

## Architecture

```
apps/web                 Next.js UI + API
apps/mcp-server          MCP tools → services
packages/billing         Stripe + entitlements
packages/training-engine Deterministic metrics
packages/concept2        Concept2Client adapter
packages/ai-coach        OpenAI interpretation
packages/services        Shared domain services
packages/database        Prisma
```

## Safety

Training analytics — not medical advice.
