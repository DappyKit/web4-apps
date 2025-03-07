import { OpenAI } from 'openai'
import { GptResponse, TokenUsage } from '../types/ai'

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
    this.maxTokens = config.maxTokens || 5000
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

      // Extract token usage information
      const tokenUsage: TokenUsage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      }

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
          tokenUsage,
        }
      }

      return {
        rawResponse,
        parsedData,
        isValid,
        tokenUsage,
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      return {
        rawResponse: '',
        isValid: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown error calling AI service'],
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
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
    let systemPrompt = `
${templateSystemPrompt}

You are a specialized JSON generation assistant. Your primary task is to generate valid JSON data that STRICTLY conforms to the provided JSON Schema.

## INSTRUCTIONS:
1. Analyze the schema structure carefully before generating any content.
2. Follow ALL constraints defined in the schema, including:
   - Required fields
   - Data types
   - String lengths (minLength, maxLength)
   - Numeric ranges (minimum, maximum)
   - Array constraints (minItems, maxItems)
   - Object property requirements
   - Enumerated values
   - Pattern constraints
3. DO NOT add extra fields that are not defined in the schema.
4. Ensure nested objects and arrays conform to their respective schema definitions.
5. Generate meaningful, contextually appropriate content based on the user's prompt.

## JSON SCHEMA:
${JSON.stringify(templateSchema, null, 2)}
`

    systemPrompt += `
## DETAILED VALIDATION REQUIREMENTS:
- Field names must exactly match those specified in the schema.
- Data types must be correct (string, number, boolean, array, object).
- String values must respect any minLength/maxLength constraints.
- Numeric values must be within any specified minimum/maximum ranges.
- Arrays must have the correct number of items (respecting minItems/maxItems).
- All required properties must be included.
- Enumerated values must be one of the allowed options.
- Pattern constraints for strings must be followed exactly.

## OBJECT STRUCTURE EXAMPLES:
- For objects with nested arrays of objects, ensure each array item has all required properties.
- For objects with optional properties, include them only when relevant to the user's request.
- For properties with specific formats (e.g., dates, URLs), ensure they follow the correct format.

## CRITICAL REQUIREMENTS:
- Your response MUST be ONLY a valid JSON object with no additional text, explanations, or formatting.
- Do not include any markdown formatting, code blocks, backticks, or explanatory text.
- The generated JSON must parse correctly as valid JSON with proper quoting of properties and values.
- Do not omit any required fields specified in the schema.
- If the user's prompt doesn't contain enough information to fill all required fields, use reasonable defaults that comply with the schema.
- Ensure all strings are properly escaped in the JSON.

Please generate a complete, valid JSON object based on the user's request that strictly adheres to the schema specifications.
`

    // Process the prompt
    const response = await this.processPrompt(prompt, systemPrompt)

    // Return the processed response
    return response
  }
}
