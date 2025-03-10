import { describe, test, expect } from 'vitest'
import { capitalizeFieldName } from '../utils/stringUtils'

describe('stringUtils', () => {
  describe('capitalizeFieldName', () => {
    test.each([
      ['name', 'Name'],
      ['firstName', 'First Name'],
      ['first_name', 'First Name'],
      ['apiKey', 'API Key'], // Updated expectation - API should be uppercase
      ['API_key', 'API Key'],
      ['URLpath', 'URL Path'], // Updated expectation - URL should be uppercase
      ['url_path', 'URL Path'],
      ['maxTokens', 'Max Tokens'],
      ['max_tokens', 'Max Tokens'],
      ['baseUrl', 'Base URL'], // Updated expectation - URL should be uppercase
      ['base_url', 'Base URL'],
      ['', ''],
      ['123test', '123test'],
      ['test123', 'Test123'],
      ['test_123', 'Test 123'],
      ['test-123', 'Test-123'],
    ])('should format %s as %s', (input, expected) => {
      expect(capitalizeFieldName(input)).toBe(expected)
    })
  })
})
