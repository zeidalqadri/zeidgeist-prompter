/**
 * Database exports for the app
 *
 * Re-exports schema definitions from the D1 schema.
 * Note: Most database operations should use the functions/_shared/db module
 * which provides the actual database connection for Cloudflare Workers.
 */

// Re-export schema and types from the D1 schema file
export * from './db/schema-d1';

/**
 * @deprecated This stub db object is deprecated.
 * Use createDb(env) from functions/_shared/db instead.
 *
 * Files using this are deprecated and pending migration to Workers-only.
 */
function createStubMethod(name: string) {
  return function(..._args: any[]): any {
    console.warn(`Direct db.${name}() is not supported in Cloudflare Workers. Use createDb(env) from functions/_shared/db`);
    throw new Error(`Use createDb(env) instead of db.${name}()`);
  };
}

export const db: any = {
  insert: createStubMethod('insert'),
  select: createStubMethod('select'),
  update: createStubMethod('update'),
  delete: createStubMethod('delete'),
  transaction: createStubMethod('transaction'),
  // Add a from method that returns chainable object
  from: createStubMethod('from'),
};

/**
 * @deprecated Placeholder for withDatabase - not available in edge runtime
 * Code using this should be migrated to use createDb(env) pattern
 */
export async function withDatabase<T>(
  envOrOperation: any,
  operation?: (db: any) => Promise<T>
): Promise<T> {
  throw new Error(
    'withDatabase is not available in edge runtime. ' +
    'Use createDb(env) from functions/_shared/db instead.'
  );
}
