# Workers API Deployment (workers.dev)

This project supports a standalone Cloudflare Worker for the API using workers.dev hostnames. This avoids DNS and custom routes while keeping Pages for static hosting.

## What’s Deployed
- Worker (prod): `zeidgeist-prompter-api.zeidalqadri.workers.dev`
- Worker (preview): `zeidgeist-prompter-api-preview.zeidalqadri.workers.dev`
- Entry: `src/worker.ts` routes `/api/*` to `functions/api/*` (engineer, tweak, health).
- Config: `wrangler.api.toml` (+ optional routes if you later add custom domains).
- CI: `.github/workflows/deploy-worker.yml` deploys prod on `main/master`, preview on `develop` and `pull_request`.

## Cloudflare Setup
1) API Token + Account ID
   - GitHub repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
2) Worker Environment Variables (Cloudflare Dashboard → Worker → Settings → Variables)
   - Required keys (prod/preview): `CLAUDE_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`, `MOONSHOT_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, etc.
3) No DNS required for workers.dev.

## Frontend App Config
- Production Pages → Env vars:
  - `NEXT_PUBLIC_API_URL=https://zeidgeist-prompter-api.zeidalqadri.workers.dev`
- Preview Pages → Env vars:
  - `NEXT_PUBLIC_API_URL=https://zeidgeist-prompter-api-preview.zeidalqadri.workers.dev`

## CSP
- Dev/Next headers and Pages `_headers` include the workers.dev hosts in `connect-src`.
- If you change hostnames, update:
  - `next.config.js` → `buildCsp()`
  - `_headers` (Pages production CSP)

## Validate
- Health:
  - `curl -sS https://zeidgeist-prompter-api.zeidalqadri.workers.dev/api/health/liveness`
- Provider status:
  - `curl -sS https://zeidgeist-prompter-api.zeidalqadri.workers.dev/api/tweak/provider-status`
- Short‑greeting test:
  - `curl --compressed -sS -X POST https://zeidgeist-prompter-api.zeidalqadri.workers.dev/api/engineer \
     -H 'Content-Type: application/json' -H 'X-Test-Provider: OpenAI' \
     --data '{"prompt":"Test prompt: Generate a simple greeting.","context":"","isRefinement":false}'`

## Optional: Custom Domains Later
- If desired, add routes to `wrangler.api.toml` and DNS records for `api.mstprmpt.zeidgeist.com` and `api.preview.mstprmpt.zeidgeist.com`.
- Update CSP and `NEXT_PUBLIC_API_URL` accordingly.

## Local Dev
- Default dev calls prod Workers.
- To use local Workers: `NEXT_PUBLIC_API_URL=http://localhost:8788` → `npm run api:dev` and `npm run dev`.
