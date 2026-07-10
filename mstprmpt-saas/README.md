# mstprmpt SaaS API

Multi-tenant prompt enhancement API with Stripe billing, scoped API keys, and usage tracking.

## Architecture

Turborepo monorepo with three packages:

- **`apps/api`** — Hono HTTP server (port 3100)
- **`packages/db`** — Drizzle ORM schema over SQLite
- **`packages/engine`** — Prompt enhancement engine (provider-agnostic)

## Database

Currently uses SQLite via `better-sqlite3` (synchronous, single-writer). This is intentional for early-stage simplicity — the Drizzle ORM abstraction makes migration to PostgreSQL straightforward when needed.

**Migrate to PostgreSQL before:**
- Running multiple API instances (SQLite is single-writer)
- Exceeding ~100 concurrent users (connection contention)
- Needing full-text search or advanced query features

## Running locally

```bash
cd mstprmpt-saas
npm install
npm run dev        # starts API on :3100
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | For billing | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | For billing | Stripe price ID for Pro plan |
| `STRIPE_ENTERPRISE_PRICE_ID` | For billing | Stripe price ID for Enterprise plan |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `APP_URL` | No | Base URL for password reset links (default: `http://localhost:3000`) |
| `PORT` | No | API port (default: `3100`) |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |
| `NODE_ENV` | No | `production` suppresses pretty-print logging |

## Deployment

The API deploys to a VPS via GitHub Actions (`.github/workflows/deploy-saas-api.yml`), triggered on pushes to `main` that touch `mstprmpt-saas/**`.
