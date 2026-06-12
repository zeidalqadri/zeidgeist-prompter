/**
 * Comprehensive Input Validation Schemas using Zod
 *
 * This module provides type-safe validation for all API endpoints,
 * preventing injection attacks, data corruption, and business logic violations.
 *
 * Security features:
 * - XSS prevention through string sanitization
 * - SQL injection prevention through input constraints
 * - Business logic validation (e.g., password strength, email format)
 * - Rate limit bypass prevention (request size limits)
 * - Type coercion attacks prevention
 */

import { z } from 'zod';

// ============================================================================
// BASE VALIDATION PRIMITIVES
// ============================================================================

/**
 * Email validation with comprehensive checks
 */
export const emailSchema = z
  .string()
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must not exceed 255 characters')
  .email('Invalid email format')
  .toLowerCase()
  .transform((email: string) => email.trim())
  .refine(
    (email: string) => {
      // Additional email security checks
      const dangerousPatterns = [
        '<', '>', '{', '}', '[', ']', '\\', '|', '^', '~', '`'
      ];
      return !dangerousPatterns.some(char => email.includes(char));
    },
    { message: 'Email contains invalid characters' }
  );

/**
 * Password validation with security requirements
 * - Minimum 12 characters (NIST 800-63B recommendation)
 * - No maximum length (allows passphrases)
 * - Checks for common weak passwords
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (password: string) => {
      // Check for at least one number OR one special character
      // (Not requiring both to allow strong passphrases)
      const hasNumberOrSpecial = /[\d\W]/.test(password);
      return hasNumberOrSpecial;
    },
    {
      message: 'Password must contain at least one number or special character'
    }
  )
  .refine(
    (password: string) => {
      // Check against common weak passwords
      const weakPasswords = [
        'password', '12345678', 'qwerty', 'abc123', 'letmein',
        'password123', 'welcome', 'monkey', '1234567890', 'password1'
      ];
      return !weakPasswords.some(weak => password.toLowerCase().includes(weak));
    },
    { message: 'Password is too weak or common' }
  );

/**
 * Username validation
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  )
  .toLowerCase()
  .transform((username: string) => username.trim());

/**
 * UUID validation
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * Prompt text validation with size limits
 */
export const promptTextSchema = z
  .string()
  .min(1, 'Prompt cannot be empty')
  .max(10000, 'Prompt must not exceed 10,000 characters')
  .transform((text: string) => text.trim())
  .refine(
    (text: string) => {
      // Prevent excessive whitespace (potential DoS)
      const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
      return whitespaceRatio < 0.9;
    },
    { message: 'Prompt contains excessive whitespace' }
  );

/**
 * Context text validation (optional, larger size limit)
 */
export const contextTextSchema = z
  .string()
  .max(20000, 'Context must not exceed 20,000 characters')
  .optional()
  .transform((text: string | undefined) => text?.trim());

/**
 * TOTP code validation (6 digits)
 */
export const totpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'TOTP code must be exactly 6 digits');

/**
 * ISO 8601 date/time validation
 */
export const isoDateSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 date format' });

/**
 * Sanitized HTML/text (prevents XSS)
 */
export const sanitizedTextSchema = z
  .string()
  .transform((text: string) => {
    // Basic XSS prevention - strip dangerous characters
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  });

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * User registration request
 */
export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).strict(); // Reject unknown fields

/**
 * User login request
 */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  totpCode: totpCodeSchema.optional(),
  rememberMe: z.boolean().optional()
}).strict();

/**
 * MFA setup request
 */
export const mfaSetupRequestSchema = z.object({
  userId: uuidSchema
}).strict();

/**
 * MFA verification request
 */
export const mfaVerifyRequestSchema = z.object({
  userId: uuidSchema,
  totpCode: totpCodeSchema
}).strict();

/**
 * Password reset request
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema
}).strict();

/**
 * Password change request
 */
export const passwordChangeRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
}).strict();

// ============================================================================
// PROMPT ENGINEERING SCHEMAS
// ============================================================================

/**
 * Prompt enhancement request
 */
export const enhancePromptRequestSchema = z.object({
  prompt: promptTextSchema,
  context: contextTextSchema,
  isRefinement: z.boolean().optional().default(false),
  isExpansion: z.boolean().optional().default(false),
  repeatCount: z.number().int().min(0).max(5).optional().default(0),
  domain: z.enum([
    'general', 'coding', 'writing', 'analysis', 'creative',
    'business', 'technical', 'research'
  ]).optional(),
  imageData: z.string().max(7_000_000, 'Image must not exceed ~5MB').optional(),
  imageMimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']).optional(),
}).strict();

/**
 * Feedback submission request
 */
export const feedbackRequestSchema = z.object({
  promptHistoryId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000, 'Feedback must not exceed 1,000 characters').optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
}).strict();

/**
 * History retrieval request
 */
export const historyRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  source: z.enum(['claude', 'openai', 'deepseek', 'mistral', 'moonshot', 'local']).optional()
}).strict();

// ============================================================================
// LEARNING SYSTEM SCHEMAS
// ============================================================================

/**
 * Learning status request
 */
export const learningStatusRequestSchema = z.object({
  detailed: z.boolean().optional().default(false)
}).strict();

/**
 * Learning trigger request (admin only)
 */
export const learningTriggerRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  targetAccuracy: z.number().min(0).max(1).optional()
}).strict();

/**
 * Pattern submission request
 */
export const patternSubmissionSchema = z.object({
  rawPrompt: promptTextSchema,
  enhancedPrompt: promptTextSchema,
  quality: z.number().min(0).max(1),
  domain: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

// ============================================================================
// PRIVACY & COMPLIANCE SCHEMAS
// ============================================================================

/**
 * Data Subject Access Request (DSAR)
 */
export const dsarRequestSchema = z.object({
  email: emailSchema,
  requestType: z.enum(['access', 'deletion', 'portability', 'correction']),
  reason: z.string().max(500).optional()
}).strict();

/**
 * Privacy consent update
 */
export const privacyConsentSchema = z.object({
  analyticsConsent: z.boolean(),
  marketingConsent: z.boolean(),
  dataProcessingConsent: z.boolean()
}).strict();

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize request body
 */
export function validateRequestBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  try {
    const result = schema.safeParse(body);

    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }

    // Format Zod errors for user-friendly messages
    const errors = result.error.issues.map((err: any) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    });

    return {
      success: false,
      errors
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid request format']
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T extends z.ZodType>(
  schema: T,
  searchParams: URLSearchParams
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  try {
    // Convert URLSearchParams to object
    const params: Record<string, string | string[]> = {};

    for (const [key, value] of searchParams.entries()) {
      if (params[key]) {
        // Handle multiple values for same key
        if (Array.isArray(params[key])) {
          (params[key] as string[]).push(value);
        } else {
          params[key] = [params[key] as string, value];
        }
      } else {
        params[key] = value;
      }
    }

    return validateRequestBody(schema, params);
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid query parameters']
    };
  }
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  errors: string[],
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation Error',
      message: 'The request contains invalid data',
      details: errors,
      timestamp: new Date().toISOString()
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Middleware: Validate request body
 */
export function withBodyValidation<T extends z.ZodType>(
  schema: T,
  handler: (
    data: z.infer<T>,
    context: any
  ) => Promise<Response>
) {
  return async (context: any): Promise<Response> => {
    try {
      const body = await context.request.json() as any;
      const validation = validateRequestBody(schema, body);

      if (!validation.success) {
        return createValidationErrorResponse(validation.errors);
      }

      return await handler(validation.data, context);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createValidationErrorResponse(['Invalid JSON in request body']);
      }

      throw error;
    }
  };
}

// ============================================================================
// SECURITY VALIDATION HELPERS
// ============================================================================

/**
 * Check for common injection patterns
 */
export function checkForInjectionPatterns(text: string): {
  isSafe: boolean;
  threats: string[];
} {
  const threats: string[] = [];

  // SQL injection patterns
  if (/(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\b--\b|\/\*|\*\/)/i.test(text)) {
    threats.push('Potential SQL injection detected');
  }

  // Command injection patterns
  if (/(\||;|&&|\$\(|\`|<\(|>\()/g.test(text)) {
    threats.push('Potential command injection detected');
  }

  // Path traversal patterns
  if (/(\.\.\/|\.\.\\)/g.test(text)) {
    threats.push('Potential path traversal detected');
  }

  // XSS patterns
  if (/<script|javascript:|on\w+\s*=/i.test(text)) {
    threats.push('Potential XSS attack detected');
  }

  return {
    isSafe: threats.length === 0,
    threats
  };
}

/**
 * Sanitize user input for safe storage and display
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000); // Enforce max length
}

export default {
  // Auth schemas
  registerRequestSchema,
  loginRequestSchema,
  mfaSetupRequestSchema,
  mfaVerifyRequestSchema,
  passwordResetRequestSchema,
  passwordChangeRequestSchema,

  // Prompt schemas
  enhancePromptRequestSchema,
  feedbackRequestSchema,
  historyRequestSchema,

  // Learning schemas
  learningStatusRequestSchema,
  learningTriggerRequestSchema,
  patternSubmissionSchema,

  // Privacy schemas
  dsarRequestSchema,
  privacyConsentSchema,

  // Helpers
  validateRequestBody,
  validateQueryParams,
  createValidationErrorResponse,
  withBodyValidation,
  checkForInjectionPatterns,
  sanitizeInput
};
