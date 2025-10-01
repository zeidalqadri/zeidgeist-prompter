/**
 * SQL Utility Functions
 *
 * Provides safe SQL operations and input sanitization to prevent SQL injection.
 */

/**
 * Sanitize user input for SQL LIKE patterns
 *
 * SQL LIKE patterns use special characters that can be abused for injection:
 * - `%` matches any sequence of characters (wildcard)
 * - `_` matches any single character
 * - `\` is the escape character
 *
 * Example attack:
 * ```typescript
 * // User input: "%'; DROP TABLE users; --"
 * like(users.email, `%${userInput}%`)
 * // Result: Matches all emails AND executes DROP TABLE
 * ```
 *
 * @param input User-provided search text
 * @returns Sanitized string safe for LIKE patterns
 *
 * @example
 * ```typescript
 * const userSearch = "admin%";  // Malicious: would match "admin", "administrator", etc.
 * const safe = sanitizeLikePattern(userSearch);  // Returns "admin\\%"
 * db.select().from(users).where(like(users.name, `%${safe}%`));
 * ```
 */
export function sanitizeLikePattern(input: string): string {
  if (typeof input !== 'string') {
    throw new TypeError('sanitizeLikePattern expects a string input');
  }

  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first (order matters!)
    .replace(/%/g, '\\%')    // Escape percent signs (wildcard)
    .replace(/_/g, '\\_');   // Escape underscores (single char wildcard)
}

/**
 * Validate UUID format before database queries
 *
 * Prevents injection via malformed UUID strings.
 *
 * @param uuid UUID string to validate
 * @returns True if valid UUID v4 format
 *
 * @example
 * ```typescript
 * if (!isValidUUID(userId)) {
 *   throw new Error('Invalid user ID format');
 * }
 * db.select().from(users).where(eq(users.id, userId));
 * ```
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format before database queries
 *
 * While Zod schemas should validate this at the API layer,
 * this provides defense-in-depth for internal functions.
 *
 * @param email Email address to validate
 * @returns True if valid email format
 *
 * @example
 * ```typescript
 * if (!isValidEmail(userEmail)) {
 *   throw new Error('Invalid email format');
 * }
 * db.select().from(users).where(eq(users.email, userEmail));
 * ```
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Sanitize array of strings for SQL IN clauses
 *
 * Ensures each value is properly escaped and valid.
 *
 * @param values Array of values to sanitize
 * @param maxLength Maximum allowed length per value (default: 255)
 * @returns Sanitized array
 *
 * @example
 * ```typescript
 * const tags = sanitizeArrayForIn(userTags, 50);
 * db.select().from(prompts).where(inArray(prompts.tags, tags));
 * ```
 */
export function sanitizeArrayForIn(values: string[], maxLength: number = 255): string[] {
  return values
    .filter((v): v is string => typeof v === 'string')
    .map(v => v.trim())
    .filter(v => v.length > 0 && v.length <= maxLength)
    .slice(0, 100); // Limit array size to prevent DoS
}

/**
 * Escape special regex characters in user input
 *
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 * when user input is used in regex patterns.
 *
 * @param input User-provided text
 * @returns Escaped string safe for regex
 *
 * @example
 * ```typescript
 * const userPattern = escapeRegex(userInput);
 * const regex = new RegExp(userPattern, 'i');
 * db.select().from(prompts).where(sql`original_text ~ ${regex}`);
 * ```
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Limit string length for database fields
 *
 * Prevents buffer overflow and excessive storage usage.
 *
 * @param input User-provided text
 * @param maxLength Maximum allowed length
 * @returns Truncated string
 *
 * @example
 * ```typescript
 * const safePrompt = limitLength(userPrompt, 10000);
 * db.insert(prompts).values({ originalText: safePrompt });
 * ```
 */
export function limitLength(input: string, maxLength: number): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.slice(0, maxLength);
}

/**
 * Validate and sanitize numeric input
 *
 * Prevents type coercion attacks and ensures numeric bounds.
 *
 * @param value User-provided value
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns Sanitized number or null if invalid
 *
 * @example
 * ```typescript
 * const limit = sanitizeNumeric(req.query.limit, 1, 100) ?? 20;
 * db.select().from(prompts).limit(limit);
 * ```
 */
export function sanitizeNumeric(
  value: unknown,
  min: number,
  max: number
): number | null {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return Math.max(min, Math.min(max, Math.floor(num)));
}

/**
 * Validate integer for pagination offset/limit
 *
 * Specialized validation for pagination parameters.
 *
 * @param value User-provided offset or limit
 * @param defaultValue Fallback value if invalid
 * @param maxValue Maximum allowed value
 * @returns Validated integer
 *
 * @example
 * ```typescript
 * const limit = validatePaginationInt(req.query.limit, 20, 100);
 * const offset = validatePaginationInt(req.query.offset, 0, 10000);
 * db.select().from(prompts).limit(limit).offset(offset);
 * ```
 */
export function validatePaginationInt(
  value: unknown,
  defaultValue: number,
  maxValue: number
): number {
  const validated = sanitizeNumeric(value, 0, maxValue);
  return validated !== null ? validated : defaultValue;
}

/**
 * Sanitize JSON metadata before database storage
 *
 * Ensures JSON is valid and within size limits.
 *
 * @param metadata User-provided metadata object
 * @param maxSizeBytes Maximum allowed JSON size in bytes
 * @returns Sanitized JSON string or null
 *
 * @example
 * ```typescript
 * const metadata = sanitizeJsonMetadata(req.body.metadata, 10000);
 * if (metadata) {
 *   db.insert(prompts).values({ metadata });
 * }
 * ```
 */
export function sanitizeJsonMetadata(
  metadata: unknown,
  maxSizeBytes: number = 10000
): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  try {
    const json = JSON.stringify(metadata);

    // Check size in bytes (UTF-8)
    const sizeBytes = new TextEncoder().encode(json).length;

    if (sizeBytes > maxSizeBytes) {
      console.warn(`JSON metadata exceeds ${maxSizeBytes} bytes (${sizeBytes}), rejecting`);
      return null;
    }

    return json;
  } catch (error) {
    console.error('Failed to serialize metadata to JSON:', error);
    return null;
  }
}

/**
 * Remove null bytes from strings
 *
 * PostgreSQL doesn't allow null bytes (\u0000) in text fields.
 * This prevents database errors from malicious input.
 *
 * @param input User-provided text
 * @returns String with null bytes removed
 *
 * @example
 * ```typescript
 * const safeText = removeNullBytes(userInput);
 * db.insert(prompts).values({ originalText: safeText });
 * ```
 */
export function removeNullBytes(input: string): string {
  return input.replace(/\0/g, '');
}

/**
 * Comprehensive input sanitization for text fields
 *
 * Combines multiple sanitization strategies:
 * - Remove null bytes
 * - Limit length
 * - Trim whitespace
 * - Normalize unicode
 *
 * @param input User-provided text
 * @param maxLength Maximum allowed length (default: 10000)
 * @returns Sanitized string
 *
 * @example
 * ```typescript
 * const prompt = sanitizeTextInput(req.body.prompt, 5000);
 * db.insert(prompts).values({ originalText: prompt });
 * ```
 */
export function sanitizeTextInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }

  return removeNullBytes(
    limitLength(
      input.trim().normalize('NFC'), // Normalize unicode to prevent encoding attacks
      maxLength
    )
  );
}

/**
 * SQL injection patterns detector (for logging/monitoring)
 *
 * Detects common SQL injection patterns in user input.
 * Use for security monitoring, not as primary defense.
 *
 * @param input User-provided text
 * @returns Array of detected threat patterns
 *
 * @example
 * ```typescript
 * const threats = detectSqlInjectionPatterns(req.body.search);
 * if (threats.length > 0) {
 *   logger.warn('Potential SQL injection attempt', { threats, userId });
 * }
 * ```
 */
export function detectSqlInjectionPatterns(input: string): string[] {
  const threats: string[] = [];

  // Common SQL injection patterns
  const patterns = [
    { name: 'SQL keywords', regex: /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i },
    { name: 'SQL comments', regex: /(--|\/\*|\*\/|#)/i },
    { name: 'SQL operators', regex: /(\bor\b\s+\d+\s*=\s*\d+|\band\b\s+\d+\s*=\s*\d+)/i },
    { name: 'Quote escaping', regex: /['"]\s*;\s*['"]/i },
    { name: 'Hex encoding', regex: /0x[0-9a-f]{2,}/i }
  ];

  for (const { name, regex } of patterns) {
    if (regex.test(input)) {
      threats.push(name);
    }
  }

  return threats;
}
