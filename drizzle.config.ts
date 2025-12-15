import type { Config } from 'drizzle-kit'

export default {
  schema: './app/lib/db/schema-d1.ts',
  out: './migrations/d1',
  dialect: 'sqlite',
} satisfies Config