export interface Template {
  id: number
  title: string
  description?: string
  url: string
  json_data: string
  created_at: Date
  updated_at: Date
  owner_address: string
}

export interface CreateTemplateDTO {
  title: string
  description?: string
  url: string
  json_data: string
}

export const TEMPLATE_VALIDATION = {
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_URL_LENGTH: 2048,
  MAX_JSON_LENGTH: 10000,
  INVALID_URL: 'Invalid URL format',
  INVALID_JSON: 'Invalid JSON format',
  JSON_TOO_LONG: 'JSON data must be less than 10000 characters',
} as const
