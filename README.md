# ErgCoach

AI-powered Concept2 rowing coaching platform. The differentiator is not “ChatGPT can see my workout” — it is that the system **understands training history and goals**, **calculates objective metrics in application code**, and uses AI only for **interpretation and coaching**.

## Architecture

```
apps/web                 Next.js UI + API routes
apps/mcp-server          MCP tools → shared services

packages/shared          Domain types & formatting
packages/database        Prisma schema, client, seed
packages/training-engine Deterministic metrics (no LLM)
packages/concept2        Concept2Client adapter + mocks
packages/ai-coach        Structured OpenAI interpretation
packages/services        Application services (web + MCP)
```

Future sources (Garmin, Strava, BikeErg, SkiErg, race distances) plug in as additional adapters feeding the same `Workout` model and training-engine pipeline.

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16 (Docker Compose provided)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env

# 3. Database
docker compose up -d postgres
# or use any Postgres and set DATABASE_URL

# 4. Migrate + seed synthetic marathon athlete
pnpm db:migrate:dev
pnpm db:seed

# 5. Analyse seeded workouts (deterministic + heuristic/AI)
pnpm db:analyse

# 6. Run web app
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo login (after seed):

- Email: `athlete@ergcoach.local`
- Password: `demo1234`

## Commands

| Command | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js web app |
| `pnpm dev:mcp` | Start MCP server (stdio) |
| `pnpm test` | Run unit tests |
| `pnpm typecheck` | Strict TypeScript across packages |
| `pnpm lint` | Lint |
| `pnpm db:migrate:dev` | Create/apply migrations |
| `pnpm db:seed` | Seed synthetic 6-week marathon athlete |
| `pnpm db:studio` | Prisma Studio |

## OpenAI setup

Set in `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Without a key, the coach layer returns an **explicit heuristic interpretation** over pre-calculated metrics (never silently invents physiology).

## Concept2 integration

1. Register an app at Concept2 Logbook developer portal (verify current docs).
2. Set `CONCEPT2_CLIENT_ID`, `CONCEPT2_CLIENT_SECRET`, `CONCEPT2_REDIRECT_URI`.
3. **Verify** OAuth/API URLs and field names against current Concept2 documentation — code marks uncertain contracts with `VERIFY`.
4. Set `CONCEPT2_USE_MOCK=false` for live mode.
5. Connect from **Settings → Connect Concept2**, then **Sync workouts**.

Local default is **mock fixtures** (`CONCEPT2_USE_MOCK=true`).

Webhook endpoint (infrastructure ready): `POST /api/concept2/webhook`.

## MCP server

```bash
# Ensure DATABASE_URL is set, then:
pnpm dev:mcp
```

Example MCP client config:

```json
{
  "mcpServers": {
    "ergcoach": {
      "command": "pnpm",
      "args": ["--filter", "@ergcoach/mcp-server", "dev"],
      "cwd": "/path/to/ErgCoach",
      "env": {
        "DATABASE_URL": "postgresql://ergcoach:ergcoach@localhost:5432/ergcoach?schema=public"
      }
    }
  }
}
```

Tools include: `get_athlete_profile`, `get_active_goal`, `get_training_plan`, `get_recent_workouts`, `get_workout`, `get_latest_workout`, `get_workout_splits`, `get_comparable_workouts`, `get_training_volume`, `get_training_metrics`, `get_progress_trends`, `get_goal_progress`, `assess_goal_readiness`, `record_workout_feedback`, `analyse_workout`.

## Seed data

All seed workouts are **synthetic**, tagged `isSyntheticSeed`, and include ~6 weeks of UT2 / UT1 / AT / 5k benchmark / strength for a 40-year-old male targeting **2:00/500m Concept2 marathon**.

## Safety

ErgCoach is training analytics software, **not medical advice**. Unusual health-related athlete notes should prompt professional evaluation — the coach prompts enforce this boundary.

## Product principle

Application code calculates pace, watts, drift, volume, zones, compliance, comparisons, and readiness evidence. The LLM interprets those calculations in context of goal, plan, and history.

## AI coach chat

Open **Coach chat** in the nav (`/coach`) or use the dashboard “Open coach chat” card.

Example questions:

- How am I progressing?
- Was today’s UT1 good?
- Can I hold 2:00 pace for a marathon?
- What’s currently holding me back?

The chat retrieves only relevant evidence (goal, readiness, recent workouts, trends) before calling OpenAI. Set `OPENAI_API_KEY` for live coaching replies.

## Deploy to AWS

Infrastructure as code: [`infra/README.md`](./infra/README.md)

| Resource | Purpose |
|----------|---------|
| RDS PostgreSQL 16 | Private database |
| ECR | Container images |
| App Runner + VPC connector | Next.js web app |
| Secrets Manager | `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY` |

### Fast path (machine with AWS credentials)

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=eu-west-2
export TF_VAR_openai_api_key=sk-...

./scripts/aws-bootstrap.sh
```

Coach chat will be at `https://<apprunner-url>/coach`.

### GitHub Actions

Add repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `OPENAI_API_KEY`.

Then run workflow **Deploy to AWS** (Actions → workflow_dispatch) or push to `main`.

### Local production image smoke test

```bash
docker compose -f docker-compose.prod.yml up --build
curl http://localhost:3000/api/health
```
