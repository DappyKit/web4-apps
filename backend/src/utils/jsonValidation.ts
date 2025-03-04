/**
 * Custom error class for JSON validation errors
 * @extends Error
 */
export class JsonValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonValidationError'
  }
}

/**
 * Type guard to check if value is a valid JSON object
 * @param value - Value to check
 * @returns boolean indicating if value is a valid JSON object
 */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard to check if value is a valid JSON array
 * @param value - Value to check
 * @returns boolean indicating if value is a valid JSON array
 */
function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Validates if a string is a valid JSON
 * @param {string} jsonString - The string to validate as JSON
 * @param {boolean} [allowEmpty=false] - Whether to allow empty objects/arrays
 * @throws {JsonValidationError} If the string is not valid JSON or violates validation rules
 * @returns {Record<string, unknown> | unknown[]} Parsed JSON object or array
 */
export function validateJson(jsonString: string, allowEmpty = false): Record<string, unknown> | unknown[] {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new JsonValidationError('JSON string is required')
  }

  try {
    const parsed = JSON.parse(jsonString)

    // Check if parsed result is actually an object or array
    if (!isJsonObject(parsed) && !isJsonArray(parsed)) {
      throw new JsonValidationError('Invalid JSON: must be an object or array')
    }

    // Check for empty objects/arrays if not allowed
    if (!allowEmpty) {
      const isEmpty = Array.isArray(parsed) ? parsed.length === 0 : Object.keys(parsed).length === 0

      if (isEmpty) {
        throw new JsonValidationError('Empty JSON objects/arrays are not allowed')
      }
    }

    return parsed
  } catch (error) {
    if (error instanceof JsonValidationError) {
      throw error
    }
    throw new JsonValidationError('Invalid JSON format')
  }
}
