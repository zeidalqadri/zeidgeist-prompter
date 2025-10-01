/**
 * Master TypeScript Linter Configuration
 * 
 * This configuration prevents the recurring TypeScript errors by:
 * 1. Enhanced type checking rules
 * 2. String indexing safety
 * 3. Function parameter validation
 * 4. Environment variable type checking
 * 5. Comprehensive ESLint integration
 */

module.exports = {
  // Enhanced TypeScript compiler options
  compilerOptions: {
    // Strict type checking (already enabled)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional safety rules to prevent common errors
    "noUncheckedIndexedAccess": true, // Prevents unsafe object key access
    "exactOptionalPropertyTypes": true, // Strict optional property handling
    "noPropertyAccessFromIndexSignature": true, // Prevents unsafe property access
    "noImplicitOverride": true, // Explicit override declarations
    "useUnknownInCatchVariables": true, // Safer catch variable typing
    
    // Module resolution enhancements
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    
    // Enhanced error reporting
    "skipLibCheck": false, // Check all type definitions
    "forceConsistentCasingInFileNames": true,
  },

  // ESLint integration for TypeScript
  eslintConfig: {
    extends: [
      'next/core-web-vitals',
      '@typescript-eslint/recommended',
      '@typescript-eslint/recommended-requiring-type-checking'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: ['./tsconfig.json', './functions/tsconfig.json'],
      tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint'],
    rules: {
      // Prevent string indexing errors
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      
      // Function parameter consistency
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      
      // Type assertion safety
      '@typescript-eslint/consistent-type-assertions': ['error', {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'allow-as-parameter'
      }],
      
      // Environment variable safety
      'no-process-env': 'error', // Force using typed env interfaces
      
      // Prevent implicit any
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-implicit-any-catch': 'error',
      
      // Object key safety
      '@typescript-eslint/dot-notation': 'error',
      'prefer-destructuring': ['error', {
        'object': true,
        'array': false
      }]
    }
  },

  // Build-time validation scripts
  buildScripts: {
    // Pre-build type check
    "type-check": "tsc --noEmit --project tsconfig.json && tsc --noEmit --project functions/tsconfig.json",
    
    // Comprehensive lint
    "lint-strict": "eslint . --ext .ts,.tsx --max-warnings 0",
    
    // Environment variable validation
    "validate-env": "node scripts/validate-env-types.js",
    
    // Combined validation
    "validate-all": "npm run type-check && npm run lint-strict && npm run validate-env"
  },

  // Pre-commit hook configuration
  preCommitHooks: [
    "npm run type-check",
    "npm run lint-strict --fix",
    "npm run validate-env"
  ],

  // Type utility patterns
  typeUtilities: {
    // Safe object key access
    safeKeyAccess: `
      type SafeKeyOf<T> = keyof T;
      function getSafeProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
        return obj[key];
      }
    `,
    
    // Environment variable helpers
    envTypes: `
      interface ProcessEnv {
        [key: string]: string | undefined;
      }
      
      function getEnvVar(key: string): string | undefined {
        return process.env[key];
      }
      
      function getRequiredEnvVar(key: string): string {
        const value = process.env[key];
        if (!value) {
          throw new Error(\`Required environment variable \${key} is not set\`);
        }
        return value;
      }
    `,
    
    // Function parameter validation
    parameterTypes: `
      type OptionalLast<T extends readonly unknown[]> = T extends readonly [
        ...infer H,
        infer L
      ]
        ? L extends undefined
          ? [...OptionalLast<H>, L]
          : [...H, L]
        : T;
    `
  }
};