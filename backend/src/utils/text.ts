/**
 * Truncates text to a specified length and adds ellipsis if needed
 * @param {string} text - The text to truncate
 * @param {number} maxLength - The maximum length (default: 100)
 * @returns {string} - The truncated text
 */
export function truncateText(text: string, maxLength = 100): string {
  if (!text) return ''

  // If text is already shorter than maxLength, return it as is
  if (text.length <= maxLength) return text

  // Otherwise, truncate and add ellipsis
  return text.substring(0, maxLength - 3) + '...'
}
