import { CreateTemplateDTO, TEMPLATE_VALIDATION } from '../types/template'

/**
 * Custom error class for template validation errors
 * @extends Error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validates a template against predefined rules
 * @param {CreateTemplateDTO} template - The template data to validate
 * @throws {ValidationError} If any validation rules are violated
 * @returns {void}
 */
export function validateTemplate(template: CreateTemplateDTO): void {
  // Validate title
  if (!template.title || !template.title.trim()) {
    throw new ValidationError('Title is required')
  }
  if (template.title.length > TEMPLATE_VALIDATION.MAX_TITLE_LENGTH) {
    throw new ValidationError(`Title must be less than ${TEMPLATE_VALIDATION.MAX_TITLE_LENGTH} characters`)
  }

  // Validate description if provided
  if (template.description && template.description.length > TEMPLATE_VALIDATION.MAX_DESCRIPTION_LENGTH) {
    throw new ValidationError(`Description must be less than ${TEMPLATE_VALIDATION.MAX_DESCRIPTION_LENGTH} characters`)
  }

  // Validate URL
  if (!template.url || !template.url.trim()) {
    throw new ValidationError('URL is required')
  }
  if (template.url.length > TEMPLATE_VALIDATION.MAX_URL_LENGTH) {
    throw new ValidationError(`URL must be less than ${TEMPLATE_VALIDATION.MAX_URL_LENGTH} characters`)
  }

  try {
    new URL(template.url)
  } catch (error) {
    throw new ValidationError(TEMPLATE_VALIDATION.INVALID_URL)
  }

  // Validate JSON data
  if (!template.json_data) {
    throw new ValidationError('JSON data is required')
  }
  if (template.json_data.length > TEMPLATE_VALIDATION.MAX_JSON_LENGTH) {
    throw new ValidationError(TEMPLATE_VALIDATION.JSON_TOO_LONG)
  }

  try {
    JSON.parse(template.json_data)
  } catch (error) {
    throw new ValidationError(TEMPLATE_VALIDATION.INVALID_JSON)
  }
}
