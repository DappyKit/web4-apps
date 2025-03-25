/* eslint-disable @typescript-eslint/no-unsafe-call */
import { v4 as uuidv4 } from 'uuid'
import express, { Request, Response } from 'express'
import { Knex } from 'knex'
import { AiUsageService } from '../utils/ai-usage'
import { TestDb } from './utils/testDb'

// Define a custom Request type that includes the address property
interface CustomRequest extends Request {
  address?: string
}

// Mock the signature verification
jest.mock('../utils/auth', () => {
  return {
    verifySignature: jest.fn().mockImplementation(() => true),
    requireAuth: (req: CustomRequest, res: Response, next: () => void) => {
      req.address = 'test-address'
      next()
    },
  }
})

// Get the mocked function for later use
const mockVerifySignature = jest.requireMock('../utils/auth').verifySignature

describe('AI Usage Limits', () => {
  let db: Knex
  let app: express.Application
  let aiUsageService: AiUsageService
  const testAddress = 'test-address'
  const testChallenge = uuidv4()
  const testSignature = 'test-signature'
  let testDb: TestDb

  beforeAll(async () => {
    try {
      // Initialize test database
      testDb = new TestDb()
      db = testDb.getDb()

      // Create Express app
      app = express()
      app.use(express.json())

      // Initialize AI usage service
      aiUsageService = new AiUsageService(db)

      // Setup test database
      await testDb.setupTestDb(false)

      // Create test user
      await db('users').insert({
        address: testAddress,
        created_at: new Date(),
        updated_at: new Date(),
      })
    } catch (err) {
      console.error('Error in beforeAll:', err)
      throw err
    }
  })

  afterAll(async () => {
    try {
      await testDb.teardownTestDb()
      await testDb.closeConnection()
    } catch (err) {
      console.error('Error in afterAll:', err)
      throw err
    }
  })

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks()

    // Reset AI usage for test user
    await db('users').where({ address: testAddress }).update({
      ai_usage_count: 0,
      ai_usage_reset_date: null,
      ai_challenge_uuid: null,
      ai_challenge_created_at: null,
    })
  })

  test('should generate a challenge for a user', async () => {
    const challenge = await aiUsageService.generateChallenge(testAddress)

    expect(challenge).toBeTruthy()

    // Verify user has challenge in database
    const user = await db('users').where({ address: testAddress }).first()
    expect(user.ai_challenge_uuid).toBeTruthy()
    expect(user.ai_challenge_created_at).toBeTruthy()
  })

  test('should verify a valid challenge and increment usage', async () => {
    // Setup mock for signature verification
    mockVerifySignature.mockReturnValue(true)

    // Generate a challenge
    const challenge = await aiUsageService.generateChallenge(testAddress)

    // Verify the challenge
    const result = await aiUsageService.verifyChallenge(testAddress, challenge, testSignature)

    expect(result.success).toBe(true)
    expect(result.remaining_attempts).toBe(9) // 10 - 1 = 9

    // Verify user usage was incremented
    const user = await db('users').where({ address: testAddress }).first()
    expect(user.ai_usage_count).toBe(1)
  })

  test('should reject an invalid challenge', async () => {
    // Setup mock for signature verification
    mockVerifySignature.mockReturnValue(false)

    // Generate a challenge
    await aiUsageService.generateChallenge(testAddress)

    // Try to verify with invalid signature
    const invalidSignature = 'invalid-signature'
    const result = await aiUsageService.verifyChallenge(testAddress, testChallenge, invalidSignature)

    expect(result.success).toBe(false)

    // Verify user usage was not incremented
    const user = await db('users').where({ address: testAddress }).first()
    expect(user.ai_usage_count).toBe(0)
  })

  test('should enforce daily usage limits', async () => {
    // Setup mock for signature verification
    mockVerifySignature.mockReturnValue(true)

    // Set user to have reached the limit
    await db('users')
      .where({ address: testAddress })
      .update({
        ai_usage_count: 10,
        ai_usage_reset_date: new Date(Date.now() + 86400000), // Tomorrow
      })

    // Generate a challenge
    const challenge = await aiUsageService.generateChallenge(testAddress)

    // Try to verify the challenge
    const result = await aiUsageService.verifyChallenge(testAddress, challenge, testSignature)

    expect(result.success).toBe(false)
    expect(result.remaining_attempts).toBe(0)
  })

  test('should reset usage count after reset date', async () => {
    // Setup user with usage from yesterday
    const yesterday = new Date(Date.now() - 86400000)
    await db('users').where({ address: testAddress }).update({
      ai_usage_count: 10,
      ai_usage_reset_date: yesterday,
    })

    // Generate a challenge
    const challenge = await aiUsageService.generateChallenge(testAddress)

    // Setup mock for signature verification
    mockVerifySignature.mockReturnValue(true)

    // Verify the challenge
    const result = await aiUsageService.verifyChallenge(testAddress, challenge, testSignature)

    expect(result.success).toBe(true)
    expect(result.remaining_attempts).toBe(9) // Should be reset and then decremented

    // Verify user usage was reset and incremented
    const user = await db('users').where({ address: testAddress }).first()
    expect(user.ai_usage_count).toBe(1)

    // Check that reset date is in the future
    if (user.ai_usage_reset_date) {
      const resetDate = new Date(user.ai_usage_reset_date as string)
      expect(resetDate.getTime()).toBeGreaterThan(Date.now())
    }
  })

  test('should return correct remaining requests', async () => {
    // Set user to have used 5 requests
    await db('users')
      .where({ address: testAddress })
      .update({
        ai_usage_count: 5,
        ai_usage_reset_date: new Date(Date.now() + 86400000), // Tomorrow
      })

    // Get remaining requests
    const remaining = await aiUsageService.getRemainingRequests(testAddress)

    expect(remaining.remaining_attempts).toBe(5) // 10 - 5 = 5
    expect(remaining.max_attempts).toBe(10)
  })
})
