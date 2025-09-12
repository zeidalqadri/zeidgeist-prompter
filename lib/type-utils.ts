/**
 * TypeScript Type Utilities
 * 
 * Utilities to prevent common TypeScript errors by providing
 * safe patterns for object access, environment variables, and function parameters.
 */

// Safe object key access to prevent string indexing errors
export type SafeKeyOf<T> = keyof T;

/**
 * Safely access object properties with type checking
 */
export function getSafeProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

/**
 * Safe object key access with fallback
 */
export function getSafePropertyWithFallback<T, K extends keyof T, F>(
  obj: T, 
  key: K, 
  fallback: F
): T[K] | F {
  return obj[key] ?? fallback;
}

/**
 * Type-safe object key checking
 */
export function hasSafeProperty<T, K extends keyof T>(
  obj: T, 
  key: K
): obj is T & Record<K, NonNullable<T[K]>> {
  return obj[key] != null;
}

// Environment variable type safety
export interface BaseEnv {
  NODE_ENV?: string;
  APP_ENV?: string;
}

/**
 * Safe environment variable access
 */
export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

/**
 * Required environment variable with error handling
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Environment variable with typed fallback
 */
export function getEnvVarWithFallback(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// Function parameter validation utilities

/**
 * Ensures optional parameters come after required ones
 */
export type OptionalLast<T extends readonly unknown[]> = T extends readonly [
  ...infer H,
  infer L
]
  ? L extends undefined
    ? [...OptionalLast<H>, L]
    : [...H, L]
  : T;

/**
 * Safe function parameter builder
 */
export type SafeFunctionParams<TRequired, TOptional = undefined> = TOptional extends undefined
  ? [TRequired]
  : [TRequired, TOptional?];

// Template object access utilities

/**
 * Safe template object access pattern
 */
export function getTemplateProperty<T extends Record<string, any>, K extends keyof T>(
  templates: T,
  key: string,
  fallback: K
): T[K] {
  return templates[key as keyof T] ?? templates[fallback];
}

/**
 * Type-safe template configuration access
 */
export function getTemplateConfig<TConfig>(
  configs: Record<string, TConfig>,
  taskType: string,
  defaultConfig: TConfig
): TConfig {
  return configs[taskType] ?? defaultConfig;
}

// Array and collection utilities

/**
 * Safe array access with bounds checking
 */
export function getSafeArrayItem<T>(array: T[], index: number): T | undefined {
  return index >= 0 && index < array.length ? array[index] : undefined;
}

/**
 * Safe array access with fallback
 */
export function getSafeArrayItemWithFallback<T>(
  array: T[], 
  index: number, 
  fallback: T
): T {
  return getSafeArrayItem(array, index) ?? fallback;
}

// Boolean parameter safety

/**
 * Ensures boolean parameters are never undefined
 */
export function ensureBoolean(value: boolean | undefined, defaultValue: boolean = false): boolean {
  return value ?? defaultValue;
}

/**
 * Safe boolean parameter builder for function calls
 */
export type SafeBooleanParam<T extends boolean | undefined> = T extends undefined 
  ? boolean 
  : T;

// Provider-specific type utilities

/**
 * AI Provider configuration type safety
 */
export interface ProviderConfig {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature?: number;
}

export function getProviderConfig<T extends ProviderConfig>(
  configs: Record<string, T>,
  provider: string,
  defaultConfig: T
): T {
  return configs[provider] ?? defaultConfig;
}

// Error handling utilities

/**
 * Type-safe error message extraction
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Safe JSON parsing with type checking
 */
export function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Export all utilities as a namespace for easy importing
export const TypeUtils = {
  getSafeProperty,
  getSafePropertyWithFallback,
  hasSafeProperty,
  getEnvVar,
  getRequiredEnvVar,
  getEnvVarWithFallback,
  getTemplateProperty,
  getTemplateConfig,
  getSafeArrayItem,
  getSafeArrayItemWithFallback,
  ensureBoolean,
  getProviderConfig,
  getSafeErrorMessage,
  safeParse
} as const;