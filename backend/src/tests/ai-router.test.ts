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

describe('AI Router', () => {
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

    // Apply migrations for test DB
    await testDb.setupTestDb()

    // Setup express app with real database and mock AiService
    app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(testDb.getDb(), mockAiService))
  })

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv

    // Rollback migrations
    await testDb.teardownTestDb()
  })

  afterAll(async () => {
    // Close database connection
    await testDb.closeConnection()
  })

  // Silence expected console errors/logs during tests
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
    it('should process a prompt and return valid JSON response', async () => {
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

      // Set up mock response from AI service
      const mockResponse: GptResponse = {
        rawResponse: '{"message":"Generated response","data":{"key":"value"}}',
        parsedData: { message: 'Generated response', data: { key: 'value' } },
        isValid: true,
      }

      // Mock the processTemplatePrompt method
      processTemplatePromptMock.mockResolvedValue(mockResponse)

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

      // Assert response
      const responseBody = response.body as AiPromptResponse
      expect(responseBody.success).toBe(true)
      expect(responseBody.data).toBeDefined()
      expect(responseBody.data?.result).toEqual(mockResponse.parsedData)
      expect(responseBody.data?.requiredValidation).toBe(false)

      // Verify AI service was called with correct parameters - now allows for 4 parameters with the last being optional
      expect(processTemplatePromptMock).toHaveBeenCalledWith(
        'Test prompt',
        expect.any(Object),
        expect.stringContaining('This template requires generating JSON'),
      )
    })

    it('should handle invalid JSON responses', async () => {
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

      // Set up mock response with invalid JSON
      const mockResponse: GptResponse = {
        rawResponse: 'This is not valid JSON',
        isValid: false,
        validationErrors: ['Failed to parse JSON response'],
      }

      // Mock the processTemplatePrompt method
      processTemplatePromptMock.mockResolvedValue(mockResponse)

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

      // Assert response includes the raw text and validation flag
      const responseBody = response.body as AiPromptResponse
      expect(responseBody.success).toBe(true)
      expect(responseBody.data).toBeDefined()
      expect(responseBody.data?.result.rawText).toBe('This is not valid JSON')
      expect(responseBody.data?.result.message).toBeDefined()
      expect(responseBody.data?.requiredValidation).toBe(true)
    })

    it('should handle missing API key', async () => {
      // Remove API key from environment
      delete process.env.OPENAI_API_KEY

      // Recreate the router without API key and without mock service
      app = express()
      app.use(express.json())
      app.use('/api/ai', createAiRouter(testDb.getDb())) // No mock service provided

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
        .expect(503)

      // Assert response
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('AI service is not available')
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

    it('should handle template not found', async () => {
      // Test with non-existent template ID
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 999, // ID that doesn't exist
      }

      const response = await request(app)
        .post('/api/ai/process-prompt')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Template not found')
    })

    it('should use template metadata for schema and system prompt if available', async () => {
      // Create a test template with metadata-like JSON in json_data
      // Since we don't have a metadata column, we'll use json_data to store metadata
      const templateSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      }

      const systemPrompt = 'Generate user data based on the prompt'

      const db = testDb.getDb()
      await db('templates').insert({
        id: 1,
        title: 'Test Template with Metadata',
        description: 'A template for testing AI with metadata',
        url: 'https://example.com/template',
        json_data: JSON.stringify({
          type: 'test',
          metadata: {
            schema: templateSchema,
            systemPrompt: systemPrompt,
          },
        }),
        owner_address: testDb.getTestAccount().address,
      })

      // Set up mock response
      const mockResponse: GptResponse = {
        rawResponse: '{"name":"Test User"}',
        parsedData: { name: 'Test User' },
        isValid: true,
      }

      // Mock the processTemplatePrompt method
      processTemplatePromptMock.mockResolvedValue(mockResponse)

      // Test data
      const requestData: AiPromptRequest = {
        prompt: 'Generate a user named Test User',
        templateId: 1,
      }

      // Make request
      await request(app).post('/api/ai/process-prompt').send(requestData).expect(200)

      // Verify AI service was called with the correct parameters - now accepts 4 parameters
      expect(processTemplatePromptMock).toHaveBeenCalledWith(
        'Generate a user named Test User',
        templateSchema,
        expect.stringContaining('Generate user data based on the prompt'),
      )
    })
  })
})
