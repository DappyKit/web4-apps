import { OpenAI } from 'openai'
import { GptResponse } from '../types/ai'

/**
 * Configuration interface for AI services
 */
interface AiServiceConfig {
  /**
   * OpenAI API key
   */
  apiKey: string

  /**
   * Model to use for completion (defaults to gpt-4o-mini)
   */
  model?: string

  /**
   * Temperature for completion (default: 0.7)
   */
  temperature?: number

  /**
   * Maximum number of tokens in the completion response (default: 500)
   */
  maxTokens?: number
}

/**
 * Service class for interacting with OpenAI's API
 */
export class AiService {
  private openai: OpenAI
  private model: string
  private temperature: number
  private maxTokens: number

  /**
   * Creates a new instance of the AI service
   * @param config - Configuration for the service
   */
  constructor(config: AiServiceConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required for AI service')
    }

    this.openai = new OpenAI({
      apiKey: config.apiKey,
    })

    this.model = config.model || 'gpt-4o-mini'
    this.temperature = config.temperature || 0.7
    this.maxTokens = config.maxTokens || 500
  }

  /**
   * Processes a prompt with the AI model
   * @param prompt - The user's prompt to process
   * @param systemPrompt - Optional system instructions for the model
   * @returns The AI response data
   */
  async processPrompt(prompt: string, systemPrompt?: string): Promise<GptResponse> {
    try {
      const messages = []

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system' as const,
          content: systemPrompt,
        })
      }

      // Add user prompt
      messages.push({
        role: 'user' as const,
        content: prompt,
      })

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      })

      const rawResponse = completion.choices[0]?.message?.content || ''

      // Try to parse JSON from the response if it looks like JSON
      let parsedData: Record<string, unknown> | undefined
      let isValid = false

      try {
        if (rawResponse.trim().startsWith('{') && rawResponse.trim().endsWith('}')) {
          parsedData = JSON.parse(rawResponse)
          isValid = true
        }
      } catch (parseError) {
        return {
          rawResponse,
          isValid: false,
          validationErrors: ['Failed to parse JSON response'],
        }
      }

      return {
        rawResponse,
        parsedData,
        isValid,
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      return {
        rawResponse: '',
        isValid: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown error calling AI service'],
      }
    }
  }

  /**
   * Process a template-specific prompt with schema validation
   * @param prompt - User prompt
   * @param templateSchema - JSON schema for validating the response
   * @param templateSystemPrompt - System prompt specific to the template
   * @returns Processed and validated response
   */
  async processTemplatePrompt(
    prompt: string,
    templateSchema: Record<string, unknown>,
    templateSystemPrompt: string,
  ): Promise<GptResponse> {
    // Build a system prompt that includes the schema requirements
    const systemPrompt = `
${templateSystemPrompt}

You MUST format your response as a valid JSON object that conforms to the following schema:
${JSON.stringify(templateSchema, null, 2)}

Ensure your response is ONLY the JSON object with no additional text or formatting.
`

    // Process the prompt
    const response = await this.processPrompt(prompt, systemPrompt)

    // Return the processed response
    return response
  }
}
