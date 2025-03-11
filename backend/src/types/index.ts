export interface User {
  address: string
  created_at?: Date
  updated_at?: Date
  ai_usage_count?: number
  ai_usage_reset_date?: Date
  ai_challenge_uuid?: string
  ai_challenge_created_at?: Date
}

export interface App {
  id: number
  name: string
  description?: string
  owner_address: string
  created_at?: Date
  updated_at?: Date
}

export interface CreateAppDTO {
  name: string
  description?: string
  signature: string
  message: string
}

export interface CreateUserDTO {
  address: string
  message: string
  signature: string
}

/**
 * DTO for requesting an AI challenge
 */
export interface AiChallengeRequestDTO {
  address: string
}

/**
 * Response data for an AI challenge request
 */
export interface AiChallengeResponseDTO {
  challenge: string
  remaining_attempts: number
  max_attempts: number
  reset_date: string
}

/**
 * DTO for verifying an AI challenge
 */
export interface AiChallengeVerifyDTO {
  address: string
  challenge: string
  signature: string
}

/**
 * Response for an AI challenge verification
 */
export interface AiChallengeVerifyResponseDTO {
  success: boolean
  remaining_attempts: number
  max_attempts: number
}

// Export AI types
export * from './ai'
