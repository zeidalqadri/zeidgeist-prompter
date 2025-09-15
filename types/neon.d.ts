declare module '@neondatabase/serverless' {
  // Minimal type shim to satisfy TypeScript during Next.js build/type-check.
  // The runtime package provides an ESM export `neon(connectionString)` that returns
  // a tagged template function compatible with drizzle-orm/neon-http.
  export function neon(connectionString: string): any
}

