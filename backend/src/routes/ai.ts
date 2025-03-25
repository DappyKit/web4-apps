/* eslint-disable @typescript-eslint/no-unsafe-argument */
import express, { Request, Response } from 'express'
import { Knex } from 'knex'
import { AiChallengeVerifyDTO } from '../types/ai'
import { AiPromptRequest } from '../types/ai'
import { AiService } from '../utils/ai-service'
import { AiUsageService } from '../utils/ai-usage'
import { requireAuth } from '../utils/auth'

// Define a custom Request type that includes the address property
interface CustomRequest extends Request {
  address?: string
}

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

/**
 * Creates an Express router for AI-related endpoints
 * @param db - Knex database instance
 * @param customAiService - Optional custom AI service for testing
 * @param customAiUsageService - Optional custom AI usage service for testing
 * @returns Express router with AI endpoints
 */
export function createAiRouter(
  db: Knex,
  customAiService: AiService | null = null,
  customAiUsageService: AiUsageService | null = null,
): express.Router {
  const router = express.Router()

  // Create AI service if not provided
  const aiService = customAiService || (OPENAI_API_KEY ? new AiService({ apiKey: OPENAI_API_KEY }) : null)

  // Create AI usage service if not provided
  const aiUsageService = customAiUsageService || new AiUsageService(db)

  /**
   * Generate a challenge for AI usage
   * GET /api/ai/challenge
   */
  router.get('/challenge', requireAuth, async (req: CustomRequest, res: Response) => {
    try {
      const address = req.address

      if (!address) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        })
      }

      // Generate a challenge
      const challenge = await aiUsageService.generateChallenge(address)

      return res.json({
        success: true,
        data: challenge,
      })
    } catch (error) {
      console.error('Error generating AI challenge:', error instanceof Error ? error.message : 'Unknown error')
      return res.status(500).json({
        success: false,
        error: 'Failed to generate challenge',
      })
    }
  })

  /**
   * Verify a challenge for AI usage
   * POST /api/ai/verify-challenge
   */
  router.post('/verify-challenge', requireAuth, async (req: CustomRequest, res: Response) => {
    try {
      const { address, challenge, signature } = req.body as AiChallengeVerifyDTO

      // Verify the challenge
      const result = await aiUsageService.verifyChallenge(address, challenge, signature)

      return res.json({
        success: result.success,
        data: {
          remaining_attempts: result.remaining_attempts,
          max_attempts: result.max_attempts,
        },
      })
    } catch (error) {
      console.error('Error verifying AI challenge:', error instanceof Error ? error.message : 'Unknown error')
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
  router.get('/remaining-requests', requireAuth, async (req: CustomRequest, res: Response) => {
    try {
      const address = req.address

      if (!address) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        })
      }

      // Get remaining requests
      const remaining = await aiUsageService.getRemainingRequests(address)

      return res.json({
        success: true,
        data: remaining,
      })
    } catch (error) {
      console.error('Error getting remaining AI requests:', error instanceof Error ? error.message : 'Unknown error')
      return res.status(500).json({
        success: false,
        error: 'Failed to get remaining requests',
      })
    }
  })

  /**
   * Process a prompt with a template
   * POST /api/ai/process-prompt
   */
  router.post(
    '/process-prompt',
    async (req: Request, res: Response, next: () => void) => {
      // Check if AI service is available first
      if (!aiService) {
        return res.status(503).json({
          success: false,
          error: 'AI service is not available',
        })
      }

      // If AI service is available, proceed with authentication
      requireAuth(req as CustomRequest, res, next)
    },
    async (req: CustomRequest, res: Response) => {
      try {
        const { prompt, templateId, challenge, signature } = req.body as AiPromptRequest
        const address = req.address

        if (!address) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
          })
        }

        // Validate required fields
        if (!prompt || !templateId || !challenge || !signature) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
          })
        }

        // Verify the challenge
        try {
          const verificationResult = await aiUsageService.verifyChallenge(address, challenge, signature)

          // If verification failed due to usage limits
          if (!verificationResult.success) {
            return res.status(403).json({
              success: false,
              error: 'Daily AI usage limit reached',
              data: {
                remaining_attempts: verificationResult.remaining_attempts,
                max_attempts: verificationResult.max_attempts,
              },
            })
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error('Error verifying challenge:', errorMessage)
          return res.status(403).json({
            success: false,
            error: 'Challenge verification failed',
          })
        }

        // Get the template
        const template = await db('templates').where({ id: templateId }).first()
        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found',
          })
        }

        // Check if template has JSON data
        if (template.json_data === '') {
          console.error('Database error: Empty JSON data')
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
          })
        }

        if (!template.json_data || template.json_data === '{}') {
          return res.status(400).json({
            success: false,
            error: 'Template JSON data is missing',
          })
        }

        // Parse the template JSON data
        let schema: Record<string, unknown>
        let systemPrompt: string
        try {
          const jsonData = JSON.parse(template.json_data)
          if (typeof jsonData !== 'object' || !jsonData || !jsonData.schema || typeof jsonData.schema !== 'object') {
            return res.status(400).json({
              success: false,
              error: 'Invalid template JSON data: missing or invalid schema',
            })
          }
          schema = jsonData.schema as Record<string, unknown>
          systemPrompt =
            typeof jsonData.systemPrompt === 'string' ? jsonData.systemPrompt : 'You are a helpful assistant.'
        } catch (error) {
          // Invalid JSON format
          console.error('Error parsing template JSON data:', error instanceof Error ? error.message : 'Unknown error')
          return res.status(400).json({
            success: false,
            error: 'Invalid template JSON data',
          })
        }

        // Check if AI service is available
        if (!aiService) {
          return res.status(503).json({
            success: false,
            error: 'AI service is not available',
          })
        }

        // Process the prompt with the template
        const result = await aiService.processTemplatePrompt(prompt, schema, systemPrompt)

        // Return the response
        return res.json({
          success: true,
          data: {
            result: result.parsedData || {},
            requiredValidation: !result.isValid,
          },
        })
      } catch (error) {
        console.error('Error processing prompt:', error instanceof Error ? error.message : 'Unknown error')
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
        })
      }
    },
  )

  return router
}
