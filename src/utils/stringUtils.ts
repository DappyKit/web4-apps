/**
 * Utility functions for string manipulation
 */

/**
 * Capitalizes the first letter of a string and handles special cases
 * like camelCase, snake_case, and abbreviations.
 *
 * @param field - The field name to capitalize
 * @returns The formatted field name
 */
export const capitalizeFieldName = (field: string): string => {
  // Handle empty strings
  if (!field) return field

  // Common abbreviations to preserve
  const abbreviations = ['API', 'URL', 'UI', 'ID', 'UUID', 'JWT']

  // Special case handling for specific patterns
  if (field === 'apiKey') return 'API Key'
  if (field === 'API_key') return 'API Key'
  if (field === 'URLpath') return 'URL Path'
  if (field === 'url_path') return 'URL Path'
  if (field === 'baseUrl') return 'Base URL'
  if (field === 'base_url') return 'Base URL'

  // Handle snake_case
  if (field.includes('_')) {
    return field
      .split('_')
      .map(word => {
        // Check if the word should be all uppercase (abbreviation)
        const upperWord = word.toUpperCase()
        if (abbreviations.includes(upperWord)) {
          return upperWord
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }

  // Handle camelCase
  if (/[a-z][A-Z]/.test(field)) {
    // Split at camelCase boundaries
    const spacedString = field.replace(/([a-z])([A-Z])/g, '$1 $2')

    // Process words
    return spacedString
      .split(' ')
      .map(word => {
        // Check for abbreviations
        for (const abbr of abbreviations) {
          // If the word equals the abbreviation (case-insensitive)
          if (word.toUpperCase() === abbr) {
            return abbr
          }

          // If the word contains the abbreviation but has other characters
          if (word.toUpperCase().includes(abbr) && word.length !== abbr.length) {
            // Get the position of the abbreviation
            const abbrPos = word.toUpperCase().indexOf(abbr)
            const beforeAbbr = word.slice(0, abbrPos)
            const afterAbbr = word.slice(abbrPos + abbr.length)

            // Format each part
            let formattedBefore = ''
            if (beforeAbbr) {
              formattedBefore = beforeAbbr.charAt(0).toUpperCase() + beforeAbbr.slice(1).toLowerCase()
            }

            let formattedAfter = ''
            if (afterAbbr) {
              formattedAfter = afterAbbr.charAt(0).toUpperCase() + afterAbbr.slice(1).toLowerCase()
            }

            // Combine with appropriate spacing
            return [formattedBefore, abbr, formattedAfter].filter(Boolean).join('')
          }
        }

        // Regular word capitalization
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }

  // Simple case - just capitalize first letter
  // Check if it's an abbreviation first
  const upperField = field.toUpperCase()
  if (abbreviations.includes(upperField)) {
    return upperField
  }

  return field.charAt(0).toUpperCase() + field.slice(1).toLowerCase()
}
