/**
 * Truncates an error message to a specified length
 * @param error - The error message to truncate
 * @param maxLength - Maximum length of the truncated message (default: 255)
 * @returns Truncated error message
 */
export const truncateError = (error: string, maxLength = 255): string => {
  if (!error) return ''
  if (error.length <= maxLength) return error
  return `${error.substring(0, maxLength)}...`
}

/**
 * Extracts error message from various error types
 * @param error - The error object or string
 * @returns Extracted error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unknown error occurred'
}
