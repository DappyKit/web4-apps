/**
 * Request interface for the AI prompt processing endpoint
 */
export interface AiPromptRequest {
  /**
   * The user's prompt to process
   */
  prompt: string

  /**
   * The ID of the template to use for processing
   */
  templateId: number

  /**
   * Optional additional context/data provided by the user
   */
  additionalContext?: Record<string, unknown>
}

/**
 * Response interface for the AI prompt processing endpoint
 */
export interface AiPromptResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean

  /**
   * The data returned when operation is successful
   */
  data?: {
    /**
     * The result generated by the AI
     */
    result: Record<string, unknown>

    /**
     * Whether validation was needed to correct the AI response
     */
    requiredValidation?: boolean
  }

  /**
   * Error message if the operation failed
   */
  error?: string
}

/**
 * Internal interface for GPT response handling
 */
export interface GptResponse {
  /**
   * The raw response from GPT
   */
  rawResponse: string

  /**
   * The parsed data from the GPT response
   */
  parsedData?: Record<string, unknown>

  /**
   * Whether the response was successfully validated against the schema
   */
  isValid: boolean

  /**
   * Validation errors if any
   */
  validationErrors?: string[]
}
