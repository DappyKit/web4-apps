// Import GitHubError from the backend
import { GitHubError } from '../../backend/src/routes/github'

/**
 * GitHub API error data interface
 */
export interface GitHubErrorData {
  message: string
  error_description?: string
}

/**
 * Custom error class for GitHub API errors
 */
export class GitHubApiError extends Error {
  private data: GitHubErrorData

  constructor(data: GitHubErrorData) {
    super(data.message)
    this.data = data
    this.name = 'GitHubApiError'
  }

  /**
   * Get error data if available
   */
  public getData(): GitHubErrorData {
    return this.data
  }

  /**
   * Create GitHubApiError from an unknown error
   * @param error - Unknown error
   */
  static fromUnknown(error: unknown): GitHubApiError {
    if (error instanceof GitHubApiError) {
      return error
    }

    if (error instanceof Error) {
      return GitHubApiError.fromError(error)
    }

    return new GitHubApiError({ message: 'Unknown error' })
  }

  /**
   * Check if an error is a GitHubApiError
   * @param error - Error to check
   */
  static isGitHubApiError(error: unknown): error is GitHubApiError {
    return error instanceof GitHubApiError
  }

  /**
   * Create GitHubApiError from error data
   * @param data - Error data
   */
  static fromData(data: GitHubErrorData): GitHubApiError {
    return new GitHubApiError(data)
  }

  static fromError(error: Error): GitHubApiError {
    return new GitHubApiError({
      message: error.message || 'Unknown error',
    })
  }
}

/**
 * Type guard for checking if an object has a response property with data
 */
function hasResponseData(
  error: unknown,
): error is { response: { data: { message: string; error_description?: string } } } {
  if (!(error instanceof Error)) {
    return false
  }

  // Use type assertion with unknown first
  const errorAny = error as unknown as { response?: { data?: { message?: string } } }
  return !!errorAny.response?.data?.message
}

/**
 * Create a GitHubApiError from an unknown error
 */
export function createGitHubApiError(error: unknown): GitHubApiError {
  if (GitHubApiError.isGitHubApiError(error)) {
    return error
  }

  if (hasResponseData(error)) {
    return new GitHubApiError({
      message: error.response.data.message,
      error_description: error.response.data.error_description,
    })
  }

  const message = error instanceof Error ? error.message : String(error)
  return new GitHubApiError({ message })
}

/**
 * Create a GitHubApiError from error data
 */
export function createGitHubApiErrorFromData(_message: string, data: GitHubErrorData): GitHubApiError {
  return new GitHubApiError(data)
}

/**
 * Parse an unknown error into a GitHubError
 * @param error - Unknown error to parse
 * @returns GitHubError instance
 */
export function parseGitHubError(error: unknown): GitHubError {
  if (error instanceof GitHubError) {
    return error
  }

  // Use a safer approach without unnecessary type assertions
  let errorMessage = 'Unknown GitHub error'

  if (typeof error === 'object' && error !== null) {
    const possibleError = error as { error?: string }
    if (typeof possibleError.error === 'string') {
      errorMessage = possibleError.error
    }
  }

  // Remove the eslint-disable comment
  return new GitHubError(errorMessage)
}
