import request from 'supertest'
import express from 'express'
import { createAiRouter } from '../routes/ai'
import { AiPromptRequest, AiPromptResponse, GptResponse } from '../types/ai'
import { TestDb } from './utils/testDb'
import { AiService } from '../utils/ai-service'
import { AiUsageService } from '../utils/ai-usage'
import { Request, Response } from 'express'

// Mock the OpenAI module
jest.mock('openai')

// Define a custom Request type that includes the address property
interface CustomRequest extends Request {
  address?: string
}

// Mock the signature verification
jest.mock('../utils/auth', () => ({
  verifySignature: jest.fn().mockResolvedValue(true),
  requireAuth: (req: CustomRequest, res: Response, next: () => void) => {
    req.address = '0x1234567890123456789012345678901234567890'
    next()
  },
}))

// Save original env and restore after tests
const originalEnv = process.env

describe('AI Routes', () => {
  let app: express.Application
  let testDb: TestDb
  let mockAiService: AiService
  let mockAiUsageService: AiUsageService
  let processTemplatePromptMock: jest.Mock

  beforeAll(async () => {
    // Initialize test database
    testDb = new TestDb()
    testDb.initTestAccounts()
  })

  beforeEach(async () => {
    // Set up environment for testing
    process.env.OPENAI_API_KEY = 'test-api-key'

    // Reset mocks
    jest.clearAllMocks()

    // Create mock functions
    processTemplatePromptMock = jest.fn()

    // Create mock AiService
    mockAiService = {
      processPrompt: jest.fn(),
      processTemplatePrompt: processTemplatePromptMock,
    } as unknown as AiService

    // Create mock AiUsageService
    mockAiUsageService = {
      generateChallenge: jest.fn().mockResolvedValue('test-challenge'),
      verifyChallenge: jest.fn().mockImplementation(async (address: string, challenge: string, signature: string) => {
        if (challenge === 'test-challenge' && signature === 'test-signature') {
          return {
            success: true,
            remaining_attempts: 9,
            max_attempts: 10,
          }
        }
        return {
          success: false,
          remaining_attempts: 0,
          max_attempts: 10,
        }
      }),
      getRemainingRequests: jest.fn().mockResolvedValue({
        remaining_attempts: 9,
        max_attempts: 10,
      }),
    } as unknown as AiUsageService

    // Apply migrations before each test
    await testDb.setupTestDb()

    // Create test user
    await testDb.getDb().table('users').insert({
      address: '0x1234567890123456789012345678901234567890',
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Set up the challenge for AI usage
    await testDb.getDb().table('users').where('address', '0x1234567890123456789012345678901234567890').update({
      ai_challenge_uuid: 'test-challenge',
      ai_challenge_created_at: new Date(),
      ai_usage_count: 0,
      ai_usage_reset_date: new Date(),
    })

    // Create a test template
    await testDb
      .getDb()
      .table('templates')
      .insert({
        id: 1,
        title: 'Test Template',
        json_data: JSON.stringify({
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              timestamp: { type: 'string' },
              processed: { type: 'boolean' },
            },
          },
          systemPrompt: 'You are a helpful assistant.',
        }),
        url: 'https://example.com',
        owner_address: '0x1234567890123456789012345678901234567890',
        created_at: new Date(),
        updated_at: new Date(),
      })

    // Setup express app with real database and mock services
    app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(testDb.getDb(), mockAiService, mockAiUsageService))
  })

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv

    // Rollback migrations after each test
    await testDb.teardownTestDb()
  })

  afterAll(async () => {
    // Close database connection
    await testDb.closeConnection()
  })

  // Silence expected console errors during error tests
  let originalConsoleError: typeof console.error
  let originalConsoleLog: typeof console.log

  beforeEach(() => {
    // Store the original console methods
    originalConsoleError = console.error
    originalConsoleLog = console.log

    // Replace with mock functions
    console.error = jest.fn()
    console.log = jest.fn()
  })

  afterEach(() => {
    // Restore the original console methods
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  describe('POST /api/ai/process-prompt', () => {
    it('should process a prompt and return a valid response', async () => {
      // Set up mock response
      const mockResponse: GptResponse = {
        rawResponse: '{"message":"This is a test response","timestamp":"2023-01-01T00:00:00Z","processed":true}',
        parsedData: {
          message: 'This is a test response',
          timestamp: '2023-01-01T00:00:00Z',
          processed: true,
        },
        isValid: true,
      }

      // Mock the processTemplatePrompt method
      processTemplatePromptMock.mockResolvedValue(mockResponse)

      // Test data
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      }

      // Make request
      const response = await request(app)
        .post('/api/ai/process-prompt')
        .set('x-wallet-address', '0x1234567890123456789012345678901234567890')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert response structure
      const responseBody = response.body as AiPromptResponse
      expect(responseBody.success).toBe(true)
      expect(responseBody.data).toBeDefined()
      expect(responseBody.data?.result).toBeDefined()
      expect(responseBody.data?.result.message).toBe('This is a test response')
      expect(responseBody.data?.result.timestamp).toBe('2023-01-01T00:00:00Z')
      expect(responseBody.data?.result.processed).toBe(true)
    })

    it('should handle missing required fields', async () => {
      // Test with missing prompt
      const invalidRequest = {
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .set('x-wallet-address', '0x1234567890123456789012345678901234567890')
        .send(invalidRequest)
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })

    it('should return 404 when template does not exist', async () => {
      // Test data with non-existent template ID
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 999, // Non-existent ID
        challenge: 'test-challenge',
        signature: 'test-signature',
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .set('x-wallet-address', '0x1234567890123456789012345678901234567890')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Template not found')
    })

    it('should handle database errors gracefully', async () => {
      // Set up test data
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      }

      // Simulate database error by setting invalid json_data
      await testDb.getDb().table('templates').where('id', 1).update({
        json_data: '',
      })

      // Make request
      const response = await request(app)
        .post('/api/ai/process-prompt')
        .set('x-wallet-address', '0x1234567890123456789012345678901234567890')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Internal server error')
    })

    it('should return 400 if template JSON data is missing', async () => {
      // Update template to have empty object JSON data
      await testDb.getDb().table('templates').where({ id: 1 }).update({
        json_data: '{}',
      })

      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .set('x-wallet-address', '0x1234567890123456789012345678901234567890')
        .send(requestData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Template JSON data is missing')
    })

    it('should return 503 if OPENAI_API_KEY is missing', async () => {
      // Remove API key
      process.env.OPENAI_API_KEY = ''

      // Recreate app to simulate missing API key
      app = express()
      app.use(express.json())
      app.use('/api/ai', createAiRouter(testDb.getDb()))

      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .set('x-wallet-address', '0x1234567890123456789012345678901234567890')
        .send(requestData)
        .expect(503)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('AI service is not available')
    })
  })
})
