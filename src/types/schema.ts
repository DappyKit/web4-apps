/**
 * JSON Schema type definitions
 */
export interface JsonSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  format?: 'email' | 'url'
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: string[]
  minimum?: number
  maximum?: number
  items?: JsonSchema
  minItems?: number
  maxItems?: number
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
}
