import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Setup test data or perform global initialization
  console.log('🚀 Starting global test setup...')

  // Wait for the development server to be ready
  try {
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle' })
    console.log('✅ Development server is ready')
  } catch (error) {
    console.error('❌ Development server not ready:', error)
    throw error
  }

  // Create test user for E2E tests
  try {
    await page.request.post('/api/auth/register', {
      data: {
        email: 'e2e-test@example.com',
        password: 'E2ETestPassword123!Secure',
        username: 'e2etest'
      }
    })
    console.log('✅ Test user created for E2E tests')
  } catch (error) {
    console.log('ℹ️ Test user may already exist, continuing...')
  }

  // Setup test database state if needed
  console.log('✅ Global setup completed')

  await browser.close()
}

export default globalSetup
