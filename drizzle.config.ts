import type { Config } from 'drizzle-kit'

export default {
  schema: './app/lib/db/schema.ts',
  out: './migrations',
} satisfies Config