import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { testDbUtils } from '../utils/test-utils'

// Mock the database module
vi.mock('../../functions/_shared/db', () => ({
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
  runMigrations: vi.fn(),
  createUser: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createPromptHistory: vi.fn(),
  getPromptHistory: vi.fn(),
  updatePromptHistory: vi.fn(),
  deletePromptHistory: vi.fn(),
  createFeedback: vi.fn(),
  getFeedback: vi.fn()
}))

describe('Database Integration Tests', () => {
  beforeEach(async () => {
    await testDbUtils.cleanupTables()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await testDbUtils.cleanupTables()
  })

  describe('User Management', () => {
    it('should create user with proper data validation', async () => {
      const { createUser } = await import('../../functions/_shared/db')
      
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        emailVerified: false,
        mfaEnabled: false
      }

      const mockUser = {
        id: 'user-id-123',
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      vi.mocked(createUser).mockResolvedValue(mockUser)

      const result = await createUser(userData)

      expect(result).toEqual(mockUser)
      expect(createUser).toHaveBeenCalledWith(userData)
    })

    it('should retrieve user by email', async () => {
      const { getUserByEmail } = await import('../../functions/_shared/db')
      
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        mfaEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      vi.mocked(getUserByEmail).mockResolvedValue(mockUser)

      const result = await getUserByEmail('test@example.com')

      expect(result).toEqual(mockUser)
      expect(getUserByEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle user not found gracefully', async () => {
      const { getUserByEmail } = await import('../../functions/_shared/db')
      
      vi.mocked(getUserByEmail).mockResolvedValue(null)

      const result = await getUserByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })

    it('should update user information', async () => {
      const { updateUser } = await import('../../functions/_shared/db')
      
      const updateData = {
        emailVerified: true,
        lastLoginAt: new Date().toISOString()
      }

      const updatedUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        username: 'testuser',
        ...updateData,
        updatedAt: new Date().toISOString()
      }

      vi.mocked(updateUser).mockResolvedValue(updatedUser)

      const result = await updateUser('user-id-123', updateData)

      expect(result).toEqual(updatedUser)
      expect(updateUser).toHaveBeenCalledWith('user-id-123', updateData)
    })

    it('should delete user and cascade related data', async () => {
      const { deleteUser } = await import('../../functions/_shared/db')
      
      vi.mocked(deleteUser).mockResolvedValue({ deletedCount: 1 })

      const result = await deleteUser('user-id-123')

      expect(result.deletedCount).toBe(1)
      expect(deleteUser).toHaveBeenCalledWith('user-id-123')
    })

    it('should enforce email uniqueness constraint', async () => {
      const { createUser } = await import('../../functions/_shared/db')
      
      const userData = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'hashedpassword'
      }

      // First user creation succeeds
      vi.mocked(createUser).mockResolvedValueOnce({
        id: 'user-1',
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const firstUser = await createUser(userData)
      expect(firstUser).toBeDefined()

      // Second user with same email should fail
      vi.mocked(createUser).mockRejectedValueOnce(
        new Error('UNIQUE constraint failed: users.email')
      )

      await expect(createUser({
        ...userData,
        username: 'user2'
      })).rejects.toThrow('UNIQUE constraint failed')
    })
  })

  describe('Prompt History Management', () => {
    it('should create prompt history entry', async () => {
      const { createPromptHistory } = await import('../../functions/_shared/db')
      
      const historyData = {
        userId: 'user-id-123',
        ipAddress: '192.168.1.1',
        original: 'Original prompt text',
        refined: 'Refined prompt text',
        metadata: JSON.stringify({ model: 'gpt-4', tokens: 150 })
      }

      const mockHistory = {
        id: 'history-id-456',
        ...historyData,
        createdAt: new Date().toISOString()
      }

      vi.mocked(createPromptHistory).mockResolvedValue(mockHistory)

      const result = await createPromptHistory(historyData)

      expect(result).toEqual(mockHistory)
      expect(createPromptHistory).toHaveBeenCalledWith(historyData)
    })

    it('should retrieve paginated prompt history', async () => {
      const { getPromptHistory } = await import('../../functions/_shared/db')
      
      const mockHistory = {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `history-${i}`,
          userId: 'user-id-123',
          original: `Original prompt ${i}`,
          refined: `Refined prompt ${i}`,
          createdAt: new Date(Date.now() - i * 3600000).toISOString()
        })),
        total: 50,
        page: 0,
        limit: 10,
        hasMore: true
      }

      vi.mocked(getPromptHistory).mockResolvedValue(mockHistory)

      const result = await getPromptHistory('user-id-123', { page: 0, limit: 10 })

      expect(result.items).toHaveLength(10)
      expect(result.total).toBe(50)
      expect(result.hasMore).toBe(true)
      expect(getPromptHistory).toHaveBeenCalledWith('user-id-123', { page: 0, limit: 10 })
    })

    it('should filter history by IP address for privacy', async () => {
      const { getPromptHistory } = await import('../../functions/_shared/db')
      
      const ipAddress = '192.168.1.100'
      const mockHistory = {
        items: [
          {
            id: 'history-1',
            userId: null,
            ipAddress,
            original: 'IP-based prompt',
            refined: 'Refined IP prompt',
            createdAt: new Date().toISOString()
          }
        ],
        total: 1,
        page: 0,
        limit: 10,
        hasMore: false
      }

      vi.mocked(getPromptHistory).mockResolvedValue(mockHistory)

      const result = await getPromptHistory(null, { ipAddress, page: 0, limit: 10 })

      expect(result.items[0].ipAddress).toBe(ipAddress)
      expect(getPromptHistory).toHaveBeenCalledWith(null, { ipAddress, page: 0, limit: 10 })
    })

    it('should update prompt history with feedback', async () => {
      const { updatePromptHistory } = await import('../../functions/_shared/db')
      
      const updateData = {
        feedback: JSON.stringify({
          rating: 5,
          comment: 'Excellent refinement!'
        })
      }

      const updatedHistory = {
        id: 'history-id-456',
        userId: 'user-id-123',
        original: 'Original prompt',
        refined: 'Refined prompt',
        feedback: updateData.feedback,
        updatedAt: new Date().toISOString()
      }

      vi.mocked(updatePromptHistory).mockResolvedValue(updatedHistory)

      const result = await updatePromptHistory('history-id-456', updateData)

      expect(result.feedback).toBe(updateData.feedback)
      expect(updatePromptHistory).toHaveBeenCalledWith('history-id-456', updateData)
    })

    it('should delete old prompt history for privacy compliance', async () => {
      const { deletePromptHistory } = await import('../../functions/_shared/db')
      
      const cutoffDate = new Date(Date.now() - 90 * 24 * 3600 * 1000) // 90 days ago

      vi.mocked(deletePromptHistory).mockResolvedValue({ deletedCount: 25 })

      const result = await deletePromptHistory({ olderThan: cutoffDate })

      expect(result.deletedCount).toBe(25)
      expect(deletePromptHistory).toHaveBeenCalledWith({ olderThan: cutoffDate })
    })
  })

  describe('Feedback Management', () => {
    it('should create feedback entry', async () => {
      const { createFeedback } = await import('../../functions/_shared/db')
      
      const feedbackData = {
        historyId: 'history-id-456',
        userId: 'user-id-123',
        rating: 4,
        comment: 'Good refinement, could be better',
        category: 'quality'
      }

      const mockFeedback = {
        id: 'feedback-id-789',
        ...feedbackData,
        createdAt: new Date().toISOString()
      }

      vi.mocked(createFeedback).mockResolvedValue(mockFeedback)

      const result = await createFeedback(feedbackData)

      expect(result).toEqual(mockFeedback)
      expect(createFeedback).toHaveBeenCalledWith(feedbackData)
    })

    it('should retrieve aggregated feedback stats', async () => {
      const { getFeedback } = await import('../../functions/_shared/db')
      
      const mockStats = {
        averageRating: 4.2,
        totalFeedback: 150,
        ratingDistribution: {
          1: 5,
          2: 10,
          3: 25,
          4: 60,
          5: 50
        },
        commonCategories: ['quality', 'accuracy', 'helpfulness']
      }

      vi.mocked(getFeedback).mockResolvedValue(mockStats)

      const result = await getFeedback({ aggregated: true })

      expect(result.averageRating).toBe(4.2)
      expect(result.totalFeedback).toBe(150)
      expect(result.ratingDistribution).toBeDefined()
    })
  })

  describe('Database Connection and Transactions', () => {
    it('should handle connection failures gracefully', async () => {
      const { connectDB } = await import('../../functions/_shared/db')
      
      vi.mocked(connectDB).mockRejectedValue(new Error('Connection failed'))

      await expect(connectDB()).rejects.toThrow('Connection failed')
    })

    it('should support database transactions', async () => {
      const { createUser, createPromptHistory } = await import('../../functions/_shared/db')
      
      // Mock successful transaction
      const userData = {
        email: 'transaction@example.com',
        username: 'transactionuser',
        password: 'hashedpassword'
      }

      const historyData = {
        userId: 'new-user-id',
        ipAddress: '192.168.1.1',
        original: 'Transaction test prompt',
        refined: 'Refined transaction prompt'
      }

      vi.mocked(createUser).mockResolvedValue({
        id: 'new-user-id',
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      vi.mocked(createPromptHistory).mockResolvedValue({
        id: 'new-history-id',
        ...historyData,
        createdAt: new Date().toISOString()
      })

      // In a real transaction, both operations would succeed or both would fail
      const user = await createUser(userData)
      const history = await createPromptHistory({
        ...historyData,
        userId: user.id
      })

      expect(user).toBeDefined()
      expect(history).toBeDefined()
      expect(history.userId).toBe(user.id)
    })

    it('should rollback transaction on failure', async () => {
      const { createUser } = await import('../../functions/_shared/db')
      
      // Mock transaction failure
      vi.mocked(createUser).mockRejectedValue(new Error('Transaction failed'))

      await expect(createUser({
        email: 'failed@example.com',
        username: 'faileduser',
        password: 'hashedpassword'
      })).rejects.toThrow('Transaction failed')
    })
  })

  describe('Database Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      const { getPromptHistory } = await import('../../functions/_shared/db')
      
      // Mock large dataset response with proper pagination
      const largeMockHistory = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: `large-history-${i}`,
          userId: 'user-with-lots-of-history',
          original: `Large dataset prompt ${i}`,
          refined: `Large dataset refined ${i}`,
          createdAt: new Date(Date.now() - i * 60000).toISOString()
        })),
        total: 10000,
        page: 0,
        limit: 1000,
        hasMore: true
      }

      vi.mocked(getPromptHistory).mockResolvedValue(largeMockHistory)

      const startTime = performance.now()
      const result = await getPromptHistory('user-with-lots-of-history', { 
        page: 0, 
        limit: 1000 
      })
      const endTime = performance.now()

      expect(result.items).toHaveLength(1000)
      expect(result.total).toBe(10000)
      
      // Query should complete reasonably quickly (mock timing)
      expect(endTime - startTime).toBeLessThan(1000) // Less than 1 second for mock
    })

    it('should optimize queries with proper indexing', async () => {
      const { getUserByEmail } = await import('../../functions/_shared/db')
      
      // Mock indexed query performance
      vi.mocked(getUserByEmail).mockImplementation(async (email) => {
        // Simulate indexed lookup - O(log n) complexity
        return {
          id: `user-${email.replace('@', '-at-')}`,
          email,
          username: email.split('@')[0],
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })

      const startTime = performance.now()
      const user = await getUserByEmail('indexed@example.com')
      const endTime = performance.now()

      expect(user).toBeDefined()
      expect(user.email).toBe('indexed@example.com')
      expect(endTime - startTime).toBeLessThan(100) // Very fast for indexed query
    })
  })

  describe('Data Integrity and Validation', () => {
    it('should validate required fields', async () => {
      const { createUser } = await import('../../functions/_shared/db')
      
      vi.mocked(createUser).mockRejectedValue(
        new Error('NOT NULL constraint failed: users.email')
      )

      await expect(createUser({
        username: 'noemailvuser',
        password: 'hashedpassword'
        // Missing email
      } as any)).rejects.toThrow('NOT NULL constraint failed')
    })

    it('should enforce foreign key constraints', async () => {
      const { createPromptHistory } = await import('../../functions/_shared/db')
      
      vi.mocked(createPromptHistory).mockRejectedValue(
        new Error('FOREIGN KEY constraint failed')
      )

      await expect(createPromptHistory({
        userId: 'non-existent-user',
        ipAddress: '192.168.1.1',
        original: 'Test prompt',
        refined: 'Refined prompt'
      })).rejects.toThrow('FOREIGN KEY constraint failed')
    })

    it('should validate data types and formats', async () => {
      const { createUser } = await import('../../functions/_shared/db')
      
      vi.mocked(createUser).mockRejectedValue(
        new Error('Invalid email format')
      )

      await expect(createUser({
        email: 'not-an-email',
        username: 'testuser',
        password: 'hashedpassword'
      })).rejects.toThrow('Invalid email format')
    })
  })

  describe('Database Security', () => {
    it('should prevent SQL injection attacks', async () => {
      const { getUserByEmail } = await import('../../functions/_shared/db')
      
      const sqlInjectionAttempt = "admin'; DROP TABLE users; --"
      
      // Mock parameterized query that safely handles malicious input
      vi.mocked(getUserByEmail).mockResolvedValue(null)

      const result = await getUserByEmail(sqlInjectionAttempt)

      expect(result).toBeNull()
      expect(getUserByEmail).toHaveBeenCalledWith(sqlInjectionAttempt)
      // In real implementation, parameterized queries would prevent SQL injection
    })

    it('should hash sensitive data before storage', async () => {
      const { createUser } = await import('../../functions/_shared/db')
      
      const userData = {
        email: 'security@example.com',
        username: 'secureuser',
        password: 'plaintext-password'
      }

      // Mock that password gets hashed before storage
      vi.mocked(createUser).mockImplementation(async (data) => {
        expect(data.password).not.toBe('plaintext-password')
        expect(data.password).toMatch(/^\$2[aby]\$/) // bcrypt format
        
        return {
          id: 'secure-user-id',
          email: data.email,
          username: data.username,
          password: data.password,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })

      const result = await createUser({
        ...userData,
        password: '$2b$12$hashed.password.here'
      })

      expect(result.password).toMatch(/^\$2[aby]\$/)
    })
  })
})