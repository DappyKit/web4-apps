import { AiService } from '../utils/ai-service'
import { mockCreateCompletion, resetMock, mockSuccessResponse, mockErrorResponse } from './__mocks__/openai'

// Mock the OpenAI module
jest.mock('openai')

describe('AiService', () => {
  let aiService: AiService

  beforeEach(() => {
    // Reset the mock before each test
    resetMock()

    // Create a new instance of the service with a dummy API key
    aiService = new AiService({
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 5000,
    })
  })

  describe('constructor', () => {
    it('should throw an error if API key is not provided', () => {
      expect(() => {
        new AiService({
          apiKey: '',
        })
      }).toThrow('API key is required for AI service')
    })

    it('should use default values if not provided', async () => {
      const service = new AiService({
        apiKey: 'test-api-key',
      })

      // We can't directly test private properties, but we can test their effects
      // through the behavior of the service when calling methods
      mockSuccessResponse('{}')
      await service.processPrompt('test')

      // Check that the default values were used in the API call
      expect(mockCreateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 5000,
        }),
      )
    })
  })

  describe('processPrompt', () => {
    it('should process a prompt and return valid JSON response', async () => {
      // Set up the mock to return a valid JSON response
      const mockJsonResponse = { test: 'response', data: 123 }
      mockSuccessResponse(JSON.stringify(mockJsonResponse))

      // Call the method with a test prompt
      const result = await aiService.processPrompt('Test prompt')

      // Verify the OpenAI API was called with the correct parameters
      expect(mockCreateCompletion).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test prompt' }],
        temperature: 0.7,
        max_tokens: 5000,
      })

      // Check the response
      expect(result.rawResponse).toBe(JSON.stringify(mockJsonResponse))
      expect(result.parsedData).toEqual(mockJsonResponse)
      expect(result.isValid).toBe(true)
    })

    it('should handle non-JSON responses', async () => {
      // Set up the mock to return a non-JSON text response
      const textResponse = 'This is just plain text without JSON.'
      mockSuccessResponse(textResponse)

      // Call the method
      const result = await aiService.processPrompt('Test prompt')

      // Check the response
      expect(result.rawResponse).toBe(textResponse)
      expect(result.parsedData).toBeUndefined()
      expect(result.isValid).toBe(false)
    })

    it('should include system prompt if provided', async () => {
      // Set up the mock to return a response
      mockSuccessResponse('{}')

      // Call the method with a system prompt
      await aiService.processPrompt('Test prompt', 'System instructions')

      // Verify the system prompt was included
      expect(mockCreateCompletion).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'System instructions' },
          { role: 'user', content: 'Test prompt' },
        ],
        temperature: 0.7,
        max_tokens: 5000,
      })
    })

    it('should handle API errors gracefully', async () => {
      // Mock console.error to prevent it from showing in test output
      const originalConsoleError = console.error
      console.error = jest.fn()

      try {
        // Set up the mock to throw an error
        const errorMessage = 'API rate limit exceeded'
        mockErrorResponse(errorMessage)

        // Call the method
        const result = await aiService.processPrompt('Test prompt')

        // Check the error handling
        expect(result.rawResponse).toBe('')
        expect(result.isValid).toBe(false)
        expect(result.validationErrors?.[0]).toContain(errorMessage)
      } finally {
        // Restore original console.error
        console.error = originalConsoleError
      }
    })
  })

  describe('processTemplatePrompt', () => {
    it('should process a template prompt with schema validation', async () => {
      // Set up the mock to return a valid JSON response
      mockSuccessResponse('{"name":"John","age":30}')

      const templateSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      }

      const systemPrompt = 'Generate a user profile'

      // Call the method
      const result = await aiService.processTemplatePrompt(
        'Create a profile for John who is 30',
        templateSchema,
        systemPrompt,
      )

      // Verify the API call included the schema in the system prompt
      expect(mockCreateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: expect.stringContaining(systemPrompt) },
            { role: 'user', content: 'Create a profile for John who is 30' },
          ],
        }),
      )

      // Check the response
      expect(result.parsedData).toEqual({ name: 'John', age: 30 })
      expect(result.isValid).toBe(true)
    })
  })
})
