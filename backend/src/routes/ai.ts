import express from 'express'
import { Knex } from 'knex'
import { AiPromptRequest, AiPromptResponse } from '../types/ai'

/**
 * Creates a router for AI-related endpoints
 * @param db - Database connection
 * @returns Express router with AI endpoints
 */
export function createAiRouter(db: Knex): express.Router {
  const router = express.Router()

  /**
   * Process a prompt with AI
   * POST /api/ai/process-prompt
   */
  router.post('/process-prompt', async (req, res) => {
    const { prompt, templateId, additionalContext: _additionalContext } = req.body as AiPromptRequest

    // Validate required fields
    if (!prompt || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt and templateId are required',
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
      console.log(`Received request to process prompt against template ${templateId}`)

      // TODO: Process the prompt with GPT or other AI model
      // This is a dummy response for now
      const dummyResponse: Record<string, unknown> = {
        message: 'This is a dummy response. GPT integration not implemented yet.',
        timestamp: new Date().toISOString(),
        processed: true,
      }

      // Return the response
      return res.status(200).json({
        success: true,
        data: {
          result: dummyResponse,
        },
      } as AiPromptResponse)
    } catch (error) {
      console.error('Database error when fetching template:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  })

  return router
}
