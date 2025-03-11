/* eslint-disable @typescript-eslint/no-unsafe-argument */
import express, { Request, Response } from 'express'
import { Knex } from 'knex'
import { AiPromptResponse, AiChallengeVerifyDTO } from '../types'
import { AiService } from '../utils/ai-service'
import { AiUsageService } from '../utils/ai-usage'
import { requireAuth } from '../utils/auth'

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// Maximum number of AI requests per day
const MAX_AI_REQUESTS_PER_DAY = 10

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

  // Create AI usage service
  const aiUsageService = new AiUsageService(db)

  /**
   * Generate a challenge for AI usage
   * GET /api/ai/challenge
   */
  router.get('/challenge', requireAuth, async (req: Request, res: Response) => {
    try {
      const address = req.headers['x-wallet-address'] as string

      if (!address) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Wallet address required',
        })
      }

      const { challenge, remainingAttempts } = await aiUsageService.generateChallenge(address)

      // Today at UTC midnight
      const now = new Date()
      const resetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

      return res.status(200).json({
        success: true,
        data: {
          challenge,
          remaining_attempts: remainingAttempts,
          max_attempts: MAX_AI_REQUESTS_PER_DAY,
          reset_date: resetDate.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error generating AI challenge:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to generate challenge',
      })
    }
  })

  /**
   * Verify a challenge signature
   * POST /api/ai/verify-challenge
   */
  router.post('/verify-challenge', requireAuth, async (req: Request, res: Response) => {
    try {
      const { address, challenge, signature } = req.body as AiChallengeVerifyDTO

      if (!address || !challenge || !signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        })
      }

      const { success, remainingAttempts } = await aiUsageService.verifyChallenge(address, challenge, signature)

      return res.status(200).json({
        success,
        data: {
          remaining_attempts: remainingAttempts,
          max_attempts: MAX_AI_REQUESTS_PER_DAY,
        },
      })
    } catch (error) {
      console.error('Error verifying AI challenge:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to verify challenge',
      })
    }
  })

  /**
   * Get remaining AI requests for a user
   * GET /api/ai/remaining-requests
   */
  router.get('/remaining-requests', requireAuth, async (req: Request, res: Response) => {
    try {
      const address = req.headers['x-wallet-address'] as string

      if (!address) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Wallet address required',
        })
      }

      const { remainingAttempts, resetDate } = await aiUsageService.getRemainingRequests(address)

      return res.status(200).json({
        success: true,
        data: {
          remaining_attempts: remainingAttempts,
          max_attempts: MAX_AI_REQUESTS_PER_DAY,
          reset_date: resetDate.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error getting remaining AI requests:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to get remaining requests',
      })
    }
  })

  /**
   * Process a prompt with AI
   * POST /api/ai/process-prompt
   */
  router.post('/process-prompt', requireAuth, async (req, res) => {
    // Extract fields from request body
    const { prompt, templateId, challenge, signature } = req.body as {
      prompt: string
      templateId: number
      challenge: string
      signature: string
    }

    // Validate required fields
    if (!prompt || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt and templateId are required',
      })
    }

    // Validate challenge and signature
    if (!challenge || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: challenge and signature are required',
      })
    }

    // Get the wallet address from auth
    const address = req.headers['x-wallet-address'] as string

    // Verify the challenge
    try {
      const verificationResult = await aiUsageService.verifyChallenge(address, challenge, signature)

      if (!verificationResult.success) {
        return res.status(403).json({
          success: false,
          error: 'Challenge verification failed or usage limit exceeded',
          data: {
            remaining_attempts: verificationResult.remainingAttempts,
            max_attempts: MAX_AI_REQUESTS_PER_DAY,
          },
        })
      }
    } catch (error) {
      console.error('Error verifying challenge:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to verify challenge',
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
