import request from 'supertest'
import express from 'express'
import { createAiRouter } from '../routes/ai'
import { AiPromptRequest, AiPromptResponse, GptResponse } from '../types/ai'
import { TestDb } from './utils/testDb'
import { AiService } from '../utils/ai-service'
import { resetMock } from './__mocks__/openai'

// Mock the OpenAI module
jest.mock('openai')

// Save original env and restore after tests
const originalEnv = process.env

describe('AI Routes', () => {
  let app: express.Application
  let testDb: TestDb
  let mockAiService: AiService
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
    processTemplatePromptMock = jest.fn()

    // Create mock AiService
    mockAiService = {
      processPrompt: jest.fn(),
      processTemplatePrompt: processTemplatePromptMock,
    } as unknown as AiService

    // Apply migrations before each test
    await testDb.setupTestDb()

    // Setup express app with real database and mock AiService
    app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(testDb.getDb(), mockAiService))
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

      // Create a test template to use in tests
      const db = testDb.getDb()
      await db('templates').insert({
        id: 1,
        title: 'Test Template',
        description: 'A template for testing AI',
        url: 'https://example.com/template',
        json_data: JSON.stringify({ type: 'test' }),
        owner_address: testDb.getTestAccount().address,
      })

      // Test data
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
      }

      // Make request
      const response = await request(app)
        .post('/api/ai/process-prompt')
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
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
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
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Template not found')
    })

    it('should handle database errors gracefully', async () => {
      // Create a test template
      const db = testDb.getDb()
      await db('templates').insert({
        id: 1,
        title: 'Test Template',
        description: 'A template for testing AI',
        url: 'https://example.com/template',
        json_data: JSON.stringify({ type: 'test' }),
        owner_address: testDb.getTestAccount().address,
      })

      // Mock a database error by making the query throw an error
      jest.spyOn(db, 'where').mockImplementationOnce(() => {
        throw new Error('Database error')
      })

      // Test data
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})
