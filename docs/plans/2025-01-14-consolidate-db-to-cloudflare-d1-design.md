# Consolidate All Databases to Cloudflare D1

**Date:** 2025-01-14
**Status:** Approved
**Branch:** zeidalqadri/consolidate-db-cf

## Context

Currently running a hybrid database architecture:
- **Neon (PostgreSQL)** - Main data (10 tables)
- **Cloudflare D1 (SQLite)** - Auth only (users + sessions)
- **Cloudflare KV** - Caching and session storage

## Goals

1. **Cost reduction** - Eliminate Neon ongoing costs
2. **Simplicity** - Single database instead of two
3. **Performance** - Everything at the edge

## Decision

Migrate all data to Cloudflare D1. Single database, single platform.

## Schema Translation

| PostgreSQL | SQLite/D1 |
|------------|-----------|
| `uuid` | `TEXT` (UUID strings) |
| `JSONB` | `TEXT` (JSON stored as text) |
| `TIMESTAMP WITH TIME ZONE` | `TEXT` (ISO-8601) |
| `BOOLEAN` | `INTEGER` (0/1) |
| GIN indexes | Dropped (not needed) |

## Tables to Migrate

| Table | Status | Notes |
|-------|--------|-------|
| `users` | Already in D1 | Verify alignment |
| `user_sessions` | Already in D1 | Verify alignment |
| `prompt_history` | Migrate | Core feature |
| `feedback` | Migrate | User ratings |
| `enhancement_logs` | Migrate | Analytics |
| `prompts` | Migrate | Prompt repo |
| `prompt_versions` | Migrate | Version control |
| `training_examples` | Migrate | ML/learning |
| `extension_downloads` | Migrate | Extension tracking |
| `audit_logs` | Migrate | Security logging |

## Migration Phases

### Phase 1: Schema Creation
- Create `migrations/d1/0003_add_all_tables.sql`
- Run migration: `wrangler d1 execute zeidgeist-auth --file=./migrations/d1/0003_add_all_tables.sql`

### Phase 2: Code Updates
- Create `functions/_shared/db-unified.ts` - Single D1 adapter
- Update all API routes to use D1
- Remove Neon connection code

### Phase 3: Data Migration
- Export from Neon
- Transform to SQLite format
- Import to D1

### Phase 4: Cleanup
- Remove `@neondatabase/serverless`, `pg` dependencies
- Delete PostgreSQL migration files
- Update `drizzle.config.ts` to SQLite
- Remove `DATABASE_URL` env var

## Files to Create

- `migrations/d1/0003_add_all_tables.sql`
- `functions/_shared/db-unified.ts`

## Files to Modify

- `functions/_shared/db.ts`
- `functions/_shared/db-d1.ts`
- `wrangler.toml`
- `drizzle.config.ts`
- `package.json`
- All routes in `functions/api/`

## Files to Delete

- `app/lib/db/connection-manager.ts`
- `app/lib/db/index.ts`
- `functions/_shared/db-cloudflare.ts`
- `functions/_shared/db-pool.ts`
- `migrations/*.sql` (PostgreSQL)
- `drizzle/migrations/*.sql`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss | Backup Neon before starting |
| D1 limits (10M rows) | Monitor logs tables, add TTL cleanup |
| Query performance | Add indexes, test critical queries |
| Breaking API routes | Update incrementally, test with wrangler dev |

## Rollback Plan

1. Keep Neon running 2 weeks post-migration (read-only)
2. Feature flag `USE_D1_DATABASE` to revert if needed
3. Regular D1 backups via `wrangler d1 export`

## Success Criteria

- All API routes work with D1
- No data loss during migration
- Neon can be safely decommissioned
- Build and deploy succeed on Cloudflare Pages

## Implementation Status

### Completed
- [x] Created D1 migration with all 11 tables (`migrations/d1/0003_add_all_tables.sql`)
- [x] Created unified D1 database adapter (`functions/_shared/db-unified.ts`)
- [x] Updated Drizzle config to SQLite dialect
- [x] Updated main `functions/_shared/db.ts` to use D1
- [x] Updated `db-pool.ts` for D1 compatibility
- [x] Removed Neon dependencies from package.json
- [x] Removed `db-cloudflare.ts`, `connection-manager.ts`, `app/lib/db/index.ts`
- [x] Updated API routes to check for AUTH_DB instead of DATABASE_URL

### Remaining Work
- [ ] Fix SQLite type compatibility issues in learning services
  - Date fields use TEXT (ISO strings) instead of Date objects
  - Insert operations need explicit `id` field (use `crypto.randomUUID()`)
- [ ] Update `app/lib/learning/*` files for D1 compatibility (or mark as Node.js only)
- [ ] Test with `wrangler dev` locally
- [ ] Run D1 migration on production: `wrangler d1 execute zeidgeist-auth --file=./migrations/d1/0003_add_all_tables.sql`
- [ ] Export data from Neon and import to D1
- [ ] Verify all routes work in production
