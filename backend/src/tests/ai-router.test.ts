import express, { Request, Response } from 'express'
import request from 'supertest'
import { createAiRouter } from '../routes/ai'
import { TestDb } from './utils/testDb'
import { AiService } from '../utils/ai-service'
import { AiUsageService } from '../utils/ai-usage'

// Define a custom Request type that includes the address property
interface CustomRequest extends Request {
  address?: string
}

// Mock the OpenAI module
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify({ result: 'mocked response' }),
                  },
                },
              ],
            }),
          },
        },
      }
    }),
  }
})

// Create a mock resetMock function
const resetMock = jest.fn()

// Mock the requireAuth middleware
jest.mock('../utils/auth', () => ({
  requireAuth: (req: CustomRequest, res: Response, next: () => void) => {
    req.address = 'test-address'
    next()
  },
  verifySignature: jest.fn().mockImplementation(() => true),
}))

// Save original env and restore after tests
const originalEnv = process.env

describe('AI Router', () => {
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
    resetMock()

    // Create mock functions
    processTemplatePromptMock = jest.fn().mockResolvedValue({
      isValid: true,
      rawResponse: '{"result": "mocked response"}',
      parsedData: { result: 'mocked response' },
    })

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

    // Apply migrations for test DB
    await testDb.setupTestDb()

    // Setup express app with real database and mock services
    app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(testDb.getDb(), mockAiService, mockAiUsageService))

    // Create a test template
    await testDb.getDb().table('templates').insert({
      id: 1,
      title: 'Test Template',
      description: 'A test template',
      owner_address: 'test-address',
      json_data:
        '{"schema": {"type": "object", "properties": {"name": {"type": "string"}}}, "systemPrompt": "You are a helpful assistant."}',
      url: 'https://example.com/template',
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Set up the challenge for AI usage
    await testDb
      .getDb()
      .table('users')
      .where('address', 'test-address')
      .update({
        ai_challenge_uuid: 'test-challenge',
        ai_challenge_created_at: new Date(),
        ai_usage_count: 0,
        ai_usage_reset_date: new Date(Date.now() + 86400000), // Tomorrow
      })
  })

  afterEach(async () => {
    // Reset the database
    await testDb.teardownTestDb()
  })

  afterAll(async () => {
    // Clean up
    await testDb.closeConnection()
    process.env = originalEnv
  })

  test('should process a prompt with a template', async () => {
    // Setup mock response
    processTemplatePromptMock.mockResolvedValueOnce({
      isValid: true,
      rawResponse: '{"name": "Test Name"}',
      parsedData: { name: 'Test Name' },
    })

    // Make a request to process a prompt
    const response = await request(app)
      .post('/api/ai/process-prompt')
      .send({
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      })
      .expect(200)

    // Verify the response format
    expect(response.body.success).toBe(true)
    expect(response.body.data).toBeDefined()
    expect(response.body.data.result).toEqual({ name: 'Test Name' })
    expect(response.body.data.requiredValidation).toBe(false)

    // Verify the mock was called with the correct arguments
    expect(processTemplatePromptMock).toHaveBeenCalledWith(
      'Test prompt',
      { type: 'object', properties: { name: { type: 'string' } } },
      'You are a helpful assistant.',
    )
  })

  test('should handle invalid template data', async () => {
    // Update the template to have invalid JSON data
    await testDb.getDb().table('templates').where({ id: 1 }).update({
      json_data: 'invalid-json',
    })

    // Make a request to process a prompt
    const response = await request(app)
      .post('/api/ai/process-prompt')
      .send({
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      })
      .expect(400)

    // Verify the response indicates an error
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('Invalid template JSON data')
  })

  test('should handle missing template', async () => {
    // Make a request with a non-existent template ID
    const response = await request(app)
      .post('/api/ai/process-prompt')
      .send({
        prompt: 'Test prompt',
        templateId: 999,
        challenge: 'test-challenge',
        signature: 'test-signature',
      })
      .expect(404)

    // Verify the response indicates an error
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('Template not found')
  })

  test('should handle missing required fields', async () => {
    // Make a request with missing fields
    const response = await request(app)
      .post('/api/ai/process-prompt')
      .send({
        prompt: 'Test prompt',
        // Missing templateId
        challenge: 'test-challenge',
        signature: 'test-signature',
      })
      .expect(400)

    // Verify the response indicates an error
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('Missing required fields')
  })

  test('should handle validation errors', async () => {
    // Setup mock response with validation error
    processTemplatePromptMock.mockResolvedValueOnce({
      isValid: false,
      rawResponse: '{"invalid": "data"}',
      parsedData: { invalid: 'data' },
    })

    // Make a request to process a prompt
    const response = await request(app)
      .post('/api/ai/process-prompt')
      .send({
        prompt: 'Test prompt',
        templateId: 1,
        challenge: 'test-challenge',
        signature: 'test-signature',
      })
      .expect(200)

    // Verify the response indicates validation is required
    expect(response.body.success).toBe(true)
    expect(response.body.data.requiredValidation).toBe(true)
  })
})
