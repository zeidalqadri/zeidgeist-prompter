# zeidgeist-prompter

Prompt refactoring web app, Chrome extension and API. It takes a raw prompt and returns a refined one, using a language model provider.

Status: early, one maintainer, no releases. The `*_REPORT.md`, `*_PLAN.md` and `*_GUIDE.md` files in the repository root are working notes written during development. They are not documentation and not guarantees.

## Parts

1. `app/`: Next.js App Router pages (dashboard, pricing, docs, auth).
2. `functions/`: Cloudflare Pages Functions under `functions/api` (engineer, auth, learning, analytics, health and others).
3. `extension/`: Chrome extension "mstprmpt - Prompt Refactorer", built with Vite.
4. `mstprmpt-saas/`: Turborepo with a Hono API, Drizzle over SQLite and the enhancement engine. Its own README describes Stripe billing, scoped API keys and usage tracking.
5. `tests/`: Vitest unit and integration tests. `playwright-tests/`: end to end tests.

## Providers

The docs name DeepSeek, Mistral, Gemini, Claude, OpenAI and Moonshot as supported providers. You supply your own keys.

## Run locally

```bash
npm install
# copy env.example to .env.local and fill in provider keys
npm run dev    # http://localhost:3333
```

Details: `LOCAL-DEPLOYMENT.md`.

## Checks

```bash
npm run validate-all   # type check, strict lint, env validation
npm test               # Vitest
```

## Deploy

Cloudflare Pages. See `CLOUDFLARE-DEPLOYMENT.md` and `DEPLOYMENT-GUIDE.md`.

## Licence

MIT, see [LICENSE](LICENSE).
