/**
 * Database Connection Manager for Cloudflare Workers
 *
 * This module provides proper connection management for Neon serverless Postgres,
 * replacing the lazy initialization anti-pattern with explicit lifecycle management.
 *
 * Key improvements:
 * - No hidden global state
 * - Explicit connection validation
 * - Connection health checks
 * - Proper error handling
 * - Request-scoped connections (stateless)
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { traceDBQuery } from '../observability/tracing';
import { logger } from '../observability/logger';
import { recordDBQuery, recordConnectionPoolUsage } from '../observability/metrics';

export type DatabaseClient = NeonHttpDatabase<typeof schema>;

export interface DatabaseConfig {
  databaseUrl: string;
  connectionTimeout?: number;
  statementTimeout?: number;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Database Connection Manager
 *
 * Note: Neon's HTTP client is connection-per-request by design (serverless-optimized).
 * Unlike traditional connection pooling, this creates a lightweight HTTP client
 * that can be reused across requests without maintaining persistent connections.
 */
export class DatabaseConnectionManager {
  private config: DatabaseConfig;
  private sqlClient: NeonQueryFunction<false, false> | null = null;
  private drizzleClient: DatabaseClient | null = null;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute

  constructor(config: DatabaseConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Validate database configuration
   */
  private validateConfig(config: DatabaseConfig): void {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    if (!config.databaseUrl.startsWith('postgres://') &&
        !config.databaseUrl.startsWith('postgresql://')) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }

    // Validate it's a Neon database URL (optional, but recommended)
    if (!config.databaseUrl.includes('neon.tech') &&
        !config.databaseUrl.includes('neon.prod') &&
        process.env.NODE_ENV === 'production') {
      console.warn('Warning: Using non-Neon database URL. Neon is recommended for Cloudflare Workers.');
    }
  }

  /**
   * Get or create database client
   *
   * This is safe to call multiple times - it will reuse the client if already created.
   * The Neon HTTP client is lightweight and doesn't maintain persistent connections.
   */
  getClient(): DatabaseClient {
    if (!this.drizzleClient) {
      this.initializeClient();
    }

    return this.drizzleClient!;
  }

  /**
   * Initialize database client
   */
  private initializeClient(): void {
    try {
      // Create Neon HTTP client with configuration
      this.sqlClient = neon(this.config.databaseUrl, {
        fetchOptions: {
          // Connection timeout (Cloudflare Workers have 30s CPU time limit)
          signal: this.config.connectionTimeout
            ? AbortSignal.timeout(this.config.connectionTimeout)
            : undefined
        }
      });

      // Create Drizzle ORM instance
      this.drizzleClient = drizzle(this.sqlClient, {
        schema,
        logger: process.env.NODE_ENV === 'development'
      });

      console.log('Database client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database client:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check - validates database connectivity
   *
   * This is cached for 1 minute to avoid excessive health checks.
   * Use forceCheck=true to bypass cache.
   */
  async healthCheck(forceCheck: boolean = false): Promise<ConnectionHealth> {
    const now = Date.now();

    // Return cached result if recent
    if (!forceCheck && (now - this.lastHealthCheck) < this.healthCheckInterval) {
      return { isHealthy: true, latencyMs: 0 };
    }

    const startTime = now;

    try {
      const client = this.getClient();

      // Simple query to check connectivity
      await client.execute(sql`SELECT 1 as health_check`);

      const latencyMs = Date.now() - startTime;
      this.lastHealthCheck = Date.now();

      logger.debug('Database health check passed', { latencyMs });
      recordDBQuery('health_check', 'system', latencyMs, true);

      return {
        isHealthy: true,
        latencyMs
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Database health check failed', error as Error, { latencyMs });
      recordDBQuery('health_check', 'system', latencyMs, false);

      return {
        isHealthy: false,
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a database operation with automatic error handling
   *
   * This is the recommended way to interact with the database.
   */
  async execute<T>(
    operation: (db: DatabaseClient) => Promise<T>,
    operationName: string = 'query',
    tableName: string = 'unknown'
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const client = this.getClient();
      const result = await operation(client);

      const duration = Date.now() - startTime;
      recordDBQuery(operationName, tableName, duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database operation failed', error as Error, {
        operation: operationName,
        table: tableName,
        duration
      });
      recordDBQuery(operationName, tableName, duration, false);

      // Enhance error with context
      if (error instanceof Error) {
        throw new DatabaseError(
          `Database operation failed: ${error.message}`,
          error
        );
      }

      throw new DatabaseError('Database operation failed with unknown error');
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(
    operation: (tx: any) => Promise<T>
  ): Promise<T> {
    const client = this.getClient();

    try {
      // Drizzle automatically handles transactions
      return await client.transaction(async (tx) => {
        return await operation(tx);
      });
    } catch (error) {
      logger.error('Transaction failed', error as Error);

      if (error instanceof Error) {
        throw new DatabaseError(
          `Transaction failed: ${error.message}`,
          error
        );
      }

      throw new DatabaseError('Transaction failed with unknown error');
    }
  }

  /**
   * Close the database connection (cleanup)
   *
   * Note: With Neon HTTP client, there's no persistent connection to close.
   * This is mainly for cleanup and state reset.
   */
  close(): void {
    this.sqlClient = null;
    this.drizzleClient = null;
    this.lastHealthCheck = 0;
    console.log('Database client closed');
  }
}

/**
 * Custom Database Error class for better error handling
 */
export class DatabaseError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}

/**
 * Factory function to create database connection manager
 *
 * This should be called once per request in Cloudflare Workers.
 */
export function createDatabaseManager(env: any): DatabaseConnectionManager {
  const config: DatabaseConfig = {
    databaseUrl: env.DATABASE_URL,
    connectionTimeout: 10000, // 10 seconds
    statementTimeout: 30000   // 30 seconds
  };

  return new DatabaseConnectionManager(config);
}

/**
 * Helper: Execute database operation with automatic connection management
 *
 * This is the simplest way to interact with the database in a Cloudflare Worker.
 */
export async function withDatabase<T>(
  env: any,
  operation: (db: DatabaseClient) => Promise<T>
): Promise<T> {
  const manager = createDatabaseManager(env);

  try {
    return await manager.execute(operation);
  } finally {
    manager.close();
  }
}

/**
 * Helper: Execute transaction with automatic connection management
 */
export async function withTransaction<T>(
  env: any,
  operation: (tx: DatabaseClient) => Promise<T>
): Promise<T> {
  const manager = createDatabaseManager(env);

  try {
    return await manager.transaction(operation);
  } finally {
    manager.close();
  }
}

// Import sql tagged template for health checks
import { sql } from 'drizzle-orm';

export { sql };
