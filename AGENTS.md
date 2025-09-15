# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, API routes, and server logic.
- `components/`: Reusable React components (PascalCase filenames).
- `lib/`: Shared utilities and configuration.
- `functions/`: Cloudflare Workers/Pages functions and related TS config.
- `tests/`: Unit/integration tests; `playwright-tests/`: end‑to‑end tests.
- `public/`: Static assets; `scripts/`: build/deploy/validation scripts.
- `drizzle/`, `migrations/`: Database schema and migrations.

## Build, Test, and Development Commands
- `npm run dev` — Start Next.js dev server on `http://localhost:3333`.
- `npm run build` — Project build for Cloudflare Pages via script.
- `npm run build:next` — Raw Next.js production build.
- `npm start` — Start Next.js in production.
- `npm run validate-all` — Type check, strict lint, and env validation.
- `npm run test` / `test:watch` — Run Vitest (watch for TDD).
- `npm run test:e2e` — Run Playwright E2E tests.
- `npm run test:coverage` — Coverage report.
- `npm run db:generate|db:migrate|db:studio` — Drizzle operations.

## Coding Style & Naming Conventions
- TypeScript-first; 2‑space indentation, semicolons optional per ESLint.
- Follow ESLint (Next.js) and `eslint.config.mjs`; keep `lint` clean.
- React components: PascalCase (`components/UserCard.tsx`).
- Tests: `*.test.ts` or `*.test.tsx` colocated or in `tests/`.
- Routes and server files follow Next.js conventions under `app/`.

## Testing Guidelines
- Unit/integration: Vitest + Testing Library; DOM via `jsdom`.
- E2E: Playwright in `playwright-tests/` with tags (e.g., `@smoke`).
- Run `npm run test:ci` locally before PRs for parity with CI.
- Aim to cover new logic; add coverage for bug fixes.

## Commit & Pull Request Guidelines
- Commits: imperative, concise. Optional scope tags seen in history: `[claude]`, `[query]`, and wrench emoji `🔧` for fixes.
  - Examples: `🔧 Fix TypeScript build error`, `[claude] Improve provider status endpoint`.
- PRs: clear description, linked issue, steps to test, and screenshots/GIFs for UI changes (`app/`, `components/`).
- Before opening: run `npm run validate-all` and `npm run test:ci`.

## Security & Configuration Tips
- Copy `env.example` to `.env.local` for local dev; validate with `npm run validate:env`.
- Secrets live in platform config (Vercel/Cloudflare), not in repo.
- Review `CLOUDFLARE-DEPLOYMENT.md` and `DEPLOYMENT-GUIDE.md` before deploying.
