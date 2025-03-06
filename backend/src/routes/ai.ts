/* eslint-disable @typescript-eslint/no-unsafe-argument */
import express from 'express'
import { Knex } from 'knex'
import { AiPromptRequest, AiPromptResponse } from '../types/ai'
import { AiService } from '../utils/ai-service'

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

/**
 * Creates a router for AI-related endpoints
 * @param db - Database connection
 * @param aiServiceOverride - Optional AiService instance for testing
 * @returns Express router with AI endpoints
 */
export function createAiRouter(db: Knex, aiServiceOverride?: AiService): express.Router {
  const router = express.Router()

  // Create AI service if API key is available or use the provided override
  let aiService: AiService | null = aiServiceOverride || null

  if (!aiService && OPENAI_API_KEY) {
    aiService = new AiService({
      apiKey: OPENAI_API_KEY,
      model: 'gpt-4o-mini', // Use gpt-4o-mini model
      temperature: 0.7,
      maxTokens: 500,
    })
  }

  /**
   * Process a prompt with AI
   * POST /api/ai/process-prompt
   */
  router.post('/process-prompt', async (req, res) => {
    const { prompt, templateId } = req.body as AiPromptRequest

    // Validate required fields
    if (!prompt || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt and templateId are required',
      })
    }

    // Check if AI service is available
    if (!aiService) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not available. OPENAI_API_KEY may be missing.',
      })
    }

    // Verify template exists
    try {
      const template = await db('templates').where({ id: templateId }).first()

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        })
      }

      // Log the received request
      console.log(`Processing prompt against template ${templateId}`)

      // Get template schema from json_data if available, otherwise use an empty object
      let templateSchema: Record<string, unknown> = {}
      // Default system prompt
      const defaultSystemPrompt = `You are a helpful assistant. Generate a JSON object based on the user's request.`
      let templateSystemPrompt: string = defaultSystemPrompt

      try {
        // Parse the template's JSON data
        const jsonData = typeof template.json_data === 'string' ? JSON.parse(template.json_data) : template.json_data

        // Check if the JSON data contains metadata
        if (jsonData && typeof jsonData === 'object' && jsonData.metadata && typeof jsonData.metadata === 'object') {
          if (jsonData.metadata.schema && typeof jsonData.metadata.schema === 'object') {
            templateSchema = jsonData.metadata.schema as Record<string, unknown>
          }

          if (jsonData.metadata.systemPrompt && typeof jsonData.metadata.systemPrompt === 'string') {
            templateSystemPrompt = jsonData.metadata.systemPrompt
          }
        }
      } catch (parseError) {
        console.error('Error parsing template JSON data:', parseError)
        // Continue with default values if parsing fails
      }

      // Process the prompt with AI
      const aiResponse = await aiService.processTemplatePrompt(prompt, templateSchema, templateSystemPrompt)

      // Check if the response is valid JSON
      if (!aiResponse.isValid) {
        // Fallback response when JSON parsing fails
        return res.status(200).json({
          success: true,
          data: {
            result: {
              rawText: aiResponse.rawResponse,
              message: 'AI response could not be parsed as valid JSON.',
              timestamp: new Date().toISOString(),
            },
            requiredValidation: true,
          },
        } as AiPromptResponse)
      }

      // Return the successful response
      return res.status(200).json({
        success: true,
        data: {
          result: aiResponse.parsedData || {},
          requiredValidation: false,
        },
      } as AiPromptResponse)
    } catch (error) {
      console.error('Error processing AI prompt:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  })

  return router
}
