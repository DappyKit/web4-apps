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
      // 16384 is the maximum token limit for gpt-4o-mini
      maxTokens: 16384,
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

      if (!template.json_data) {
        return res.status(400).json({
          success: false,
          error: 'Template JSON data is missing',
        })
      }

      // Log the received request
      console.log(`Processing prompt against template ${templateId}`)

      // Default system prompt for JSON generation
      const defaultSystemPrompt = `You are a specialized JSON generator. Your task is to create a valid JSON object that matches the provided schema based on the user's request.`

      // Build enhanced system prompt with template context
      const enhancedSystemPrompt = `
${defaultSystemPrompt}

This template requires generating JSON that strictly follows this schema specification:
`

      // Process the prompt with AI
      const aiResponse = await aiService.processTemplatePrompt(prompt, template.json_data, enhancedSystemPrompt)

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
