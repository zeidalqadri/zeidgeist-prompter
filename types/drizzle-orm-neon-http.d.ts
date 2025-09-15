declare module 'drizzle-orm/neon-http' {
  // Minimal type shim for drizzle-orm neon HTTP driver used at runtime
  export function drizzle(client: any, options?: any): any
  export type NeonHttpDatabase = any
}
