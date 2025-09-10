import { test, expect, Page } from '@playwright/test'

test.describe('PromptEngineer E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/')
    
    // Login for authenticated tests
    await page.click('text=Sign In')
    await page.fill('[data-testid="email-input"]', 'e2e-test@example.com')
    await page.fill('[data-testid="password-input"]', 'E2ETestPassword123!Secure')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Navigate to main prompt engineer interface
    await page.goto('/')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Prompt Input and Refinement', () => {
    test('should accept and process prompt input', async () => {
      const originalPrompt = 'Write a comprehensive test plan for a web application'
      
      // Find and fill the prompt input
      await page.fill('[data-testid="original-prompt"]', originalPrompt)
      
      // Verify input is displayed
      await expect(page.locator('[data-testid="original-prompt"]')).toHaveValue(originalPrompt)
      
      // Click refine button
      await page.click('[data-testid="refine-button"]')
      
      // Wait for loading state
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
      
      // Wait for refined output
      await expect(page.locator('[data-testid="refined-output"]')).toBeVisible({ timeout: 30000 })
      
      // Verify refined output contains content
      const refinedText = await page.locator('[data-testid="refined-output"]').textContent()
      expect(refinedText).toBeTruthy()
      expect(refinedText!.length).toBeGreaterThan(originalPrompt.length)
    })

    test('should handle empty prompt input gracefully', async () => {
      // Try to refine without entering a prompt
      await page.click('[data-testid="refine-button"]')
      
      // Should show validation message
      await expect(page.locator('[data-testid="validation-message"]')).toContainText('Please enter a prompt')
      
      // Should not show loading or crash
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()
    })

    test('should handle very long prompts', async () => {
      const longPrompt = 'This is a very long prompt. '.repeat(500) // ~12,500 characters
      
      await page.fill('[data-testid="original-prompt"]', longPrompt)
      await page.click('[data-testid="refine-button"]')
      
      // Should handle long prompts without crashing
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
      
      // Wait for processing to complete (may take longer for long prompts)
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 60000 })
    })

    test('should show appropriate error for service failures', async () => {
      // Mock API failure by intercepting network requests
      await page.route('/api/engineer', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service temporarily unavailable' })
        })
      })
      
      await page.fill('[data-testid="original-prompt"]', 'Test prompt')
      await page.click('[data-testid="refine-button"]')
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Service temporarily unavailable')
      
      // Should hide loading indicator
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()
    })

    test('should support prompt refinement iterations', async () => {
      const originalPrompt = 'Write a simple test'
      
      // First refinement
      await page.fill('[data-testid="original-prompt"]', originalPrompt)
      await page.click('[data-testid="refine-button"]')
      
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      const firstRefinement = await page.locator('[data-testid="refined-output"]').textContent()
      
      // Use refined output for second iteration
      await page.click('[data-testid="use-refined-button"]')
      
      // Verify refined output is now in input field
      const inputValue = await page.locator('[data-testid="original-prompt"]').inputValue()
      expect(inputValue).toBe(firstRefinement?.trim())
      
      // Refine again
      await page.click('[data-testid="refine-button"]')
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      const secondRefinement = await page.locator('[data-testid="refined-output"]').textContent()
      expect(secondRefinement).toBeTruthy()
    })
  })

  test.describe('Copy to Clipboard Functionality', () => {
    test('should copy refined prompt to clipboard', async () => {
      await page.fill('[data-testid="original-prompt"]', 'Test prompt for copying')
      await page.click('[data-testid="refine-button"]')
      
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      // Mock clipboard API
      await page.evaluate(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: (text: string) => {
              // Store in window for verification
              (window as any).clipboardText = text
              return Promise.resolve()
            }
          }
        })
      })
      
      // Click copy button
      await page.click('[data-testid="copy-refined-button"]')
      
      // Verify success feedback
      await expect(page.locator('[data-testid="copy-success-message"]')).toContainText('Copied to clipboard')
      
      // Verify clipboard content
      const clipboardText = await page.evaluate(() => (window as any).clipboardText)
      expect(clipboardText).toBeTruthy()
    })

    test('should copy original prompt to clipboard', async () => {
      const originalPrompt = 'Original prompt to copy'
      
      await page.fill('[data-testid="original-prompt"]', originalPrompt)
      
      // Mock clipboard API
      await page.evaluate(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: (text: string) => {
              (window as any).clipboardText = text
              return Promise.resolve()
            }
          }
        })
      })
      
      await page.click('[data-testid="copy-original-button"]')
      
      const clipboardText = await page.evaluate(() => (window as any).clipboardText)
      expect(clipboardText).toBe(originalPrompt)
    })

    test('should handle clipboard API failures gracefully', async () => {
      await page.fill('[data-testid="original-prompt"]', 'Test prompt')
      await page.click('[data-testid="refine-button"]')
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      // Mock clipboard API failure
      await page.evaluate(() => {
        Object.assign(navigator, {
          clipboard: {
            writeText: () => Promise.reject(new Error('Clipboard access denied'))
          }
        })
      })
      
      await page.click('[data-testid="copy-refined-button"]')
      
      // Should show error message
      await expect(page.locator('[data-testid="copy-error-message"]')).toContainText('Failed to copy')
    })
  })

  test.describe('History Management', () => {
    test('should display prompt history', async () => {
      // First, create some history by refining prompts
      const prompts = [
        'First test prompt',
        'Second test prompt',
        'Third test prompt'
      ]
      
      for (const prompt of prompts) {
        await page.fill('[data-testid="original-prompt"]', prompt)
        await page.click('[data-testid="refine-button"]')
        await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
        await page.waitForTimeout(1000) // Brief pause between requests
      }
      
      // Open history section
      await page.click('[data-testid="history-toggle"]')
      
      // Verify history is displayed
      await expect(page.locator('[data-testid="history-section"]')).toBeVisible()
      
      // Should show recent prompts
      for (const prompt of prompts) {
        await expect(page.locator(`text=${prompt}`)).toBeVisible()
      }
    })

    test('should support history pagination', async () => {
      // Open history section
      await page.click('[data-testid="history-toggle"]')
      
      // If there are more than 10 items, should show pagination
      const historyItems = await page.locator('[data-testid="history-item"]').count()
      
      if (historyItems >= 10) {
        await expect(page.locator('[data-testid="load-more-history"]')).toBeVisible()
        
        // Click load more
        await page.click('[data-testid="load-more-history"]')
        
        // Should load more items
        const newHistoryItems = await page.locator('[data-testid="history-item"]').count()
        expect(newHistoryItems).toBeGreaterThan(historyItems)
      }
    })

    test('should allow reusing prompts from history', async () => {
      // Create a prompt first
      const testPrompt = 'Reusable test prompt'
      await page.fill('[data-testid="original-prompt"]', testPrompt)
      await page.click('[data-testid="refine-button"]')
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      // Clear the input
      await page.fill('[data-testid="original-prompt"]', '')
      
      // Open history and reuse the prompt
      await page.click('[data-testid="history-toggle"]')
      await page.click(`[data-testid="history-item"]:has-text("${testPrompt}") [data-testid="reuse-prompt"]`)
      
      // Verify prompt is loaded back into input
      const inputValue = await page.locator('[data-testid="original-prompt"]').inputValue()
      expect(inputValue).toBe(testPrompt)
    })

    test('should show history loading states', async () => {
      // Open history section
      await page.click('[data-testid="history-toggle"]')
      
      // Should show loading state initially
      await expect(page.locator('[data-testid="history-loading"]')).toBeVisible()
      
      // Should hide loading state when loaded
      await expect(page.locator('[data-testid="history-loading"]')).not.toBeVisible({ timeout: 10000 })
    })

    test('should handle empty history gracefully', async () => {
      // Mock empty history response
      await page.route('/api/engineer/history-dual-mode', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 0, hasMore: false })
        })
      })
      
      await page.click('[data-testid="history-toggle"]')
      
      // Should show empty state message
      await expect(page.locator('[data-testid="empty-history-message"]')).toContainText('No prompts found')
    })
  })

  test.describe('Feedback System', () => {
    test('should allow submitting feedback on refined prompts', async () => {
      // Create a refined prompt first
      await page.fill('[data-testid="original-prompt"]', 'Test prompt for feedback')
      await page.click('[data-testid="refine-button"]')
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      // Open feedback form
      await page.click('[data-testid="feedback-button"]')
      
      // Wait for feedback form to load (it's lazy loaded)
      await expect(page.locator('[data-testid="feedback-form"]')).toBeVisible()
      
      // Rate the refinement
      await page.click('[data-testid="rating-star-4"]') // 4 star rating
      
      // Add feedback comment
      await page.fill('[data-testid="feedback-comment"]', 'Great refinement, very helpful!')
      
      // Submit feedback
      await page.click('[data-testid="submit-feedback"]')
      
      // Verify success message
      await expect(page.locator('[data-testid="feedback-success"]')).toContainText('Thank you for your feedback')
    })

    test('should validate feedback form inputs', async () => {
      await page.fill('[data-testid="original-prompt"]', 'Test prompt')
      await page.click('[data-testid="refine-button"]')
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      await page.click('[data-testid="feedback-button"]')
      await expect(page.locator('[data-testid="feedback-form"]')).toBeVisible()
      
      // Try to submit without rating
      await page.click('[data-testid="submit-feedback"]')
      
      // Should show validation message
      await expect(page.locator('[data-testid="rating-error"]')).toContainText('Please provide a rating')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work properly on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      
      // Main interface should be visible and functional
      await expect(page.locator('[data-testid="original-prompt"]')).toBeVisible()
      await expect(page.locator('[data-testid="refine-button"]')).toBeVisible()
      
      // Test basic functionality
      await page.fill('[data-testid="original-prompt"]', 'Mobile test prompt')
      await page.click('[data-testid="refine-button"]')
      
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    })

    test('should work properly on tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad
      
      await expect(page.locator('[data-testid="original-prompt"]')).toBeVisible()
      await expect(page.locator('[data-testid="refine-button"]')).toBeVisible()
      
      // History should be accessible on tablet
      await page.click('[data-testid="history-toggle"]')
      await expect(page.locator('[data-testid="history-section"]')).toBeVisible()
    })

    test('should adapt layout for different screen sizes', async () => {
      // Test various viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // iPhone 5
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 } // Desktop
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        
        // Core functionality should remain accessible
        await expect(page.locator('[data-testid="original-prompt"]')).toBeVisible()
        await expect(page.locator('[data-testid="refine-button"]')).toBeVisible()
      }
    })
  })

  test.describe('Performance and UX', () => {
    test('should show loading states during API calls', async () => {
      await page.fill('[data-testid="original-prompt"]', 'Performance test prompt')
      
      // Click refine and immediately check for loading indicator
      await page.click('[data-testid="refine-button"]')
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
      
      // Button should be disabled during loading
      await expect(page.locator('[data-testid="refine-button"]')).toBeDisabled()
      
      // Wait for completion
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      
      // Loading should be hidden and button enabled
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="refine-button"]')).toBeEnabled()
    })

    test('should handle slow network conditions gracefully', async () => {
      // Simulate slow network
      await page.route('/api/engineer', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ refined: 'Slowly refined prompt' })
          })
        }, 5000) // 5 second delay
      })
      
      await page.fill('[data-testid="original-prompt"]', 'Slow network test')
      await page.click('[data-testid="refine-button"]')
      
      // Should show loading for extended period
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
      
      // Should eventually complete
      await expect(page.locator('[data-testid="refined-output"]')).toBeVisible({ timeout: 10000 })
    })

    test('should prevent multiple simultaneous refinement requests', async () => {
      await page.fill('[data-testid="original-prompt"]', 'Double click test')
      
      // Rapidly click refine button multiple times
      await Promise.all([
        page.click('[data-testid="refine-button"]'),
        page.click('[data-testid="refine-button"]'),
        page.click('[data-testid="refine-button"]')
      ])
      
      // Button should be disabled after first click
      await expect(page.locator('[data-testid="refine-button"]')).toBeDisabled()
      
      // Only one request should be processed
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should be fully keyboard navigable', async () => {
      // Tab through all interactive elements
      await page.keyboard.press('Tab') // Prompt input
      await expect(page.locator('[data-testid="original-prompt"]')).toBeFocused()
      
      await page.keyboard.press('Tab') // Refine button
      await expect(page.locator('[data-testid="refine-button"]')).toBeFocused()
      
      // Should be able to activate with Enter/Space
      await page.fill('[data-testid="original-prompt"]', 'Keyboard test')
      await page.keyboard.press('Enter')
      
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    })

    test('should have proper ARIA labels and roles', async () => {
      // Check important elements have proper ARIA attributes
      await expect(page.locator('[data-testid="original-prompt"]')).toHaveAttribute('aria-label')
      await expect(page.locator('[data-testid="refine-button"]')).toHaveAttribute('aria-label')
      await expect(page.locator('[data-testid="refined-output"]')).toHaveAttribute('role', 'region')
    })

    test('should announce status changes to screen readers', async () => {
      await page.fill('[data-testid="original-prompt"]', 'Screen reader test')
      await page.click('[data-testid="refine-button"]')
      
      // Loading indicator should have aria-live
      await expect(page.locator('[data-testid="loading-indicator"]')).toHaveAttribute('aria-live', 'polite')
      
      // Results should be announced
      await page.waitForSelector('[data-testid="refined-output"]', { timeout: 30000 })
      await expect(page.locator('[data-testid="refined-output"]')).toHaveAttribute('aria-live', 'polite')
    })

    test('should support high contrast mode', async () => {
      // Enable high contrast mode
      await page.emulateMedia({ media: 'screen', colorScheme: 'dark' })
      
      // Elements should still be visible and functional
      await expect(page.locator('[data-testid="original-prompt"]')).toBeVisible()
      await expect(page.locator('[data-testid="refine-button"]')).toBeVisible()
    })
  })
})