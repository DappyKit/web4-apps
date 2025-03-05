import request from 'supertest'
import express from 'express'
import { createAiRouter } from '../routes/ai'
import { AiPromptRequest, AiPromptResponse } from '../types/ai'
import { TestDb } from './utils/testDb'

describe('AI Routes', () => {
  let app: express.Application
  let testDb: TestDb

  beforeAll(async () => {
    // Initialize test database
    testDb = new TestDb()
    testDb.initTestAccounts()
  })

  beforeEach(async () => {
    // Apply migrations before each test
    await testDb.setupTestDb()

    // Setup express app with real database
    app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(testDb.getDb()))
  })

  afterEach(async () => {
    // Rollback migrations after each test
    await testDb.teardownTestDb()
  })

  afterAll(async () => {
    // Close database connection
    await testDb.closeConnection()
  })

  describe('POST /api/ai/process-prompt', () => {
    it('should process a prompt and return a valid response', async () => {
      // Test data
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
      }

      // Create a test template to use in tests
      await testDb
        .getDb()('templates')
        .insert({
          id: 1,
          title: 'Test Template',
          description: 'A template for testing AI',
          url: 'https://example.com/template',
          json_data: JSON.stringify({ type: 'test' }),
          owner_address: testDb.getTestAccount().address,
        })

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
      expect(responseBody.data?.result.message).toBeDefined()
      expect(responseBody.data?.result.timestamp).toBeDefined()
      expect(responseBody.data?.result.processed).toBeDefined()
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

    it('should include additional context when provided', async () => {
      // Create a test template to use in tests
      await testDb
        .getDb()('templates')
        .insert({
          id: 1,
          title: 'Test Template',
          description: 'A template for testing AI',
          url: 'https://example.com/template',
          json_data: JSON.stringify({ type: 'test' }),
          owner_address: testDb.getTestAccount().address,
        })

      // Test data with additional context
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt with context',
        templateId: 1,
        additionalContext: {
          userPreference: 'detailed',
          format: 'json',
        },
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
    })

    it('should return 404 when template does not exist', async () => {
      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 999, // Non-existent template ID
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
      // Create a mock database that throws an error
      const mockDb = testDb.createMockDbWithError('simple')

      // Create app with the mocked db
      const errorApp = express()
      errorApp.use(express.json())
      errorApp.use('/api/ai', createAiRouter(mockDb))

      const requestData: AiPromptRequest = {
        prompt: 'Test prompt',
        templateId: 1,
      }

      const response = await request(errorApp)
        .post('/api/ai/process-prompt')
        .send(requestData)
        .expect('Content-Type', /json/)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})
