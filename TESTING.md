# Testing Infrastructure Documentation

This document provides comprehensive information about the testing infrastructure for the zeidgeist-prompter application.

## Overview

The application uses a multi-layered testing approach:

- **Unit Tests** - Fast, isolated tests for individual functions and components
- **Integration Tests** - Tests for API endpoints, database operations, and service interactions  
- **End-to-End Tests** - Full user journey testing with Playwright
- **Performance Tests** - Load testing and performance benchmarks

## Test Framework Stack

- **Vitest** - Modern test runner for unit and integration tests
- **React Testing Library** - Component testing utilities
- **Playwright** - End-to-end testing framework
- **MSW (Mock Service Worker)** - API mocking for tests
- **jsdom** - DOM environment for component tests

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm run test:ci
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                 # Global test setup
├── utils/
│   └── test-utils.tsx       # Shared testing utilities
├── mocks/
│   ├── server.ts            # MSW server setup
│   └── handlers.ts          # API mock handlers
├── unit/                    # Unit tests
│   ├── auth.test.ts
│   └── prompt-engineer.test.tsx
├── integration/             # Integration tests
│   ├── api.test.ts
│   └── database.test.ts
└── privacy-validation.test.ts
└── auth-flow-tests.test.ts

playwright-tests/
├── global-setup.ts          # E2E test setup
├── global-teardown.ts       # E2E test cleanup
└── e2e/
    ├── auth-flow.spec.ts
    └── prompt-engineer.spec.ts
```

## Writing Tests

### Unit Tests

Create unit tests in `tests/unit/` directory:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../utils/test-utils'
import YourComponent from '../../components/YourComponent'

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Integration Tests

Create integration tests in `tests/integration/` directory:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { testDbUtils } from '../utils/test-utils'

describe('API Integration Tests', () => {
  beforeEach(async () => {
    await testDbUtils.cleanupTables()
  })

  it('should handle API request correctly', async () => {
    const response = await fetch('/api/endpoint')
    expect(response.status).toBe(200)
  })
})
```

### E2E Tests

Create E2E tests in `playwright-tests/e2e/` directory:

```typescript
import { test, expect } from '@playwright/test'

test('user can complete flow', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Button')
  await expect(page.locator('.result')).toBeVisible()
})
```

## Test Utilities

### Custom Render Function
```typescript
import { render, screen } from '../utils/test-utils'

// Renders component with all necessary providers
render(<YourComponent />)
```

### Mock Data Factories
```typescript
import { createMockUser, createMockPromptHistory } from '../utils/test-utils'

const user = createMockUser({ email: 'test@example.com' })
const history = createMockPromptHistory(5) // Create 5 mock items
```

### Database Test Utilities
```typescript
import { testDbUtils } from '../utils/test-utils'

// Clean up test database
await testDbUtils.cleanupTables()

// Seed test data
await testDbUtils.seedTestData()
```

## Mocking

### API Mocking with MSW
API requests are automatically mocked in tests using MSW. Mock responses are defined in `tests/mocks/handlers.ts`.

### Custom Mocks
```typescript
import { vi } from 'vitest'

// Mock a module
vi.mock('../../lib/auth', () => ({
  validateToken: vi.fn().mockResolvedValue({ valid: true })
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true })
  })
)
```

## Testing Authentication

### Testing Protected Routes
```typescript
// Login first
await page.click('text=Sign In')
await page.fill('[data-testid="email-input"]', 'test@example.com')
await page.fill('[data-testid="password-input"]', 'password')
await page.click('[data-testid="login-button"]')

// Then test protected functionality
await page.goto('/protected-page')
```

### Testing with Mock Authentication
```typescript
// Mock authenticated user
const mockUser = createMockUser()
vi.mocked(getUserFromToken).mockResolvedValue(mockUser)
```

## Database Testing

### Test Database Setup
Tests use a separate test database. Database setup and cleanup happens automatically:

```typescript
beforeEach(async () => {
  await testDbUtils.cleanupTables()
})
```

### Testing Database Operations
```typescript
// Test database operations
const user = await createUser(userData)
expect(user.id).toBeDefined()

// Test data isolation
const userHistory = await getPromptHistory(user.id)
expect(userHistory).toHaveLength(0)
```

## Coverage Requirements

The project maintains minimum coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## Performance Testing

### Running Performance Tests
```bash
npm run test:performance
```

### Custom Performance Tests
```typescript
test('should complete within performance budget', async ({ page }) => {
  const start = performance.now()
  await page.goto('/')
  const end = performance.now()
  
  expect(end - start).toBeLessThan(3000) // 3 second budget
})
```

## Accessibility Testing

E2E tests include accessibility checks:

```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.locator('input')).toBeFocused()
})

test('should have proper ARIA labels', async ({ page }) => {
  await expect(page.locator('button')).toHaveAttribute('aria-label')
})
```

## Security Testing

### Testing Authentication Security
```typescript
test('should reject weak passwords', async () => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      password: '123' // Weak password
    })
  })
  
  expect(response.status).toBe(400)
})
```

### Testing Input Sanitization
```typescript
test('should sanitize malicious input', async () => {
  const maliciousInput = '<script>alert("xss")</script>'
  // Test that malicious input is properly sanitized
})
```

## CI/CD Integration

Tests run automatically in GitHub Actions:

1. **Unit Tests** - Run on every push/PR
2. **Integration Tests** - Run on every push/PR  
3. **E2E Tests** - Run on every push/PR
4. **Performance Tests** - Run on every push
5. **Security Tests** - Run on every push

### CI Environment Variables
Required secrets in GitHub Actions:
- `CLOUDFLARE_API_TOKEN`
- `SNYK_TOKEN` (optional)
- `SLACK_WEBHOOK_URL` (optional)

## Best Practices

### Test Organization
- Keep tests close to the code they test
- Use descriptive test names
- Group related tests with `describe` blocks
- Follow AAA pattern (Arrange, Act, Assert)

### Test Data
- Use factories for creating test data
- Clean up test data after each test
- Use realistic test data that mirrors production

### Async Testing
- Always await async operations
- Use proper timeout values
- Handle race conditions properly

### Mocking Strategy
- Mock external dependencies
- Use MSW for API mocking
- Keep mocks simple and focused

### Performance
- Keep unit tests fast (<100ms each)
- Use integration tests sparingly
- Parallelize test execution where possible

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout values in test configuration
- Check for unresolved promises
- Ensure proper cleanup

**Flaky tests**
- Add proper waits for async operations
- Use deterministic test data
- Avoid depending on timing

**Database tests failing**
- Ensure test database is properly set up
- Check database connection strings
- Verify migrations are running

**E2E tests failing**
- Check if application is running
- Verify test selectors exist
- Check for race conditions

### Debug Tips

```bash
# Run tests in debug mode
npm run test:watch

# Run specific test file
npm run test:unit -- auth.test.ts

# Run E2E tests with UI
npm run test:e2e:ui

# Generate detailed coverage report
npm run test:coverage
```

## Contributing

When adding new features:

1. Write tests for new functionality
2. Ensure all tests pass
3. Maintain coverage thresholds
4. Update test documentation if needed

When fixing bugs:

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Ensure the test now passes
4. Consider adding additional edge cases

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

---

For questions about testing, please check existing test files for patterns and examples, or reach out to the development team.