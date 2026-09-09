# ErgCoach

AI-powered Concept2 coaching. Objective metrics are calculated in app code; AI interprets them in context of your goal and history.

## Stack

- **Auth**: Amazon Cognito (Amplify Auth)
- **Data**: Amazon DynamoDB via Amplify Data (AppSync)
- **Hosting**: AWS Amplify Hosting (SSR Next.js)

## Quick start

```bash
pnpm install
cp .env.example .env
# set OPENAI_API_KEY, CONCEPT2_CLIENT_ID, CONCEPT2_CLIENT_SECRET

# Start Amplify Gen 2 sandbox (Cognito + DynamoDB) — writes amplify_outputs.json
npx ampx sandbox

# In another terminal
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → **Create an account** (Cognito email verification) → **Programs** → **Connect Concept2**.

Marathon program follows the [Concept2 Marathon Row Training Plan](https://www.concept2.com/training/plans/marathon-row-training-plan) with weeks 5 and 9 AT sessions replaced by 5k time trials for pace recalibration.

## Concept2 (your Logbook)

1. Register an app at [Concept2 Logbook developers](https://log.concept2.com/developers)
2. Redirect URI: `http://localhost:3000/api/concept2/callback` (or your Amplify production URL)
3. Set in `.env`:

```
CONCEPT2_CLIENT_ID=...
CONCEPT2_CLIENT_SECRET=...
CONCEPT2_REDIRECT_URI=http://localhost:3000/api/concept2/callback
CONCEPT2_USE_MOCK=false
```

4. Sign in → **Settings** → **Connect Concept2** → **Sync workouts**

Each user connects **their own** Logbook. Tokens are stored per account (`DataConnection`).

## Auth (Cognito)

Email/password signup goes through Cognito. On confirmation, a Lambda creates:

- `User` (id = Cognito `sub`)
- `AthleteProfile`
- Free `Subscription`

The Next.js app uses Amplify Auth cookies (`@aws-amplify/adapter-nextjs`).

## Subscriptions (Stripe)

| Plan | Access |
|------|--------|
| Free | Logging, metrics, dashboard |
| Pro | + AI coach chat, AI workout reports, AI weekly review |

See `.env.example` for Stripe keys. Webhook: `POST /api/billing/webhook`.

## Deploy to Amplify

1. Push this repo to GitHub
2. In AWS Amplify Console → **Create app** → connect the repo
3. Amplify detects `amplify.yml` + Gen 2 `amplify/` backend
4. Set branch env vars (OpenAI, Concept2, Stripe, `NEXT_PUBLIC_APP_URL`)
5. Deploy

Backend (Cognito + AppSync/DynamoDB) deploys via `ampx pipeline-deploy` in `amplify.yml`.

Local backend iteration:

```bash
npx ampx sandbox
```

## Architecture

```
amplify/                 Gen 2 backend (Cognito + Amplify Data)
apps/web                 Next.js UI + API (SSR on Amplify Hosting)
apps/mcp-server          MCP tools → services
packages/billing         Stripe + entitlements
packages/training-engine Deterministic metrics
packages/concept2        Concept2Client adapter
packages/ai-coach        OpenAI interpretation
packages/services        Shared domain services
packages/database        Amplify Data / DynamoDB client (Prisma-shaped facade)
```

## Legacy Docker / App Runner

`infra/terraform` (RDS + App Runner) and root `Dockerfile` target the previous Postgres stack and are **not** used for Amplify. Prefer Amplify Hosting + Gen 2 backend.

## Safety

Training analytics — not medical advice.
