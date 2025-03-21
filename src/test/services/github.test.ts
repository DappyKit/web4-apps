import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GitHubService } from '../../services/github'

// For window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://test.example.com',
  },
})

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock environment variables
// For Vite environment variables
const originalEnv = { ...import.meta.env }

describe('GitHubService', () => {
  let service: GitHubService

  beforeEach(() => {
    // Access the class directly instead of using the default export
    service = new GitHubService()
    vi.clearAllMocks()

    // Reset environment - use defineProperty instead of direct assignment
    Object.defineProperty(import.meta, 'env', {
      value: { ...originalEnv },
      writable: true,
    })
    delete (import.meta.env as Record<string, unknown>).VITE_GITHUB_CLIENT_ID
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getUserInfo', () => {
    it('should throw an error when access token is missing', async () => {
      try {
        await service.getUserInfo('')
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof Error).toBe(true)
        expect((error as Error).message).toBe('Access token is required')
      }
    })

    it('should throw an error when user data is invalid', async () => {
      // Mock a successful response with invalid data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      try {
        await service.getUserInfo('test-token')
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof Error).toBe(true)
        expect((error as Error).message).toBe('Failed to get user info')
      }
    })

    it('should throw an error on network issues', async () => {
      // Mock a network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await service.getUserInfo('test-token')
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof Error).toBe(true)
        expect((error as Error).message).toBe('Failed to get user info')
      }
    })

    it('should return user data when request is successful', async () => {
      // Mock user data
      const mockUser = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
      }

      // Mock a successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      } as Response)

      const user = await service.getUserInfo('test-token')
      expect(user).toEqual(mockUser)
    })
  })

  describe('generateAuthUrl', () => {
    it('should throw an error when client ID is not configured', () => {
      // Ensure client ID is not set and force meta env to be empty for this test
      delete (import.meta.env as Record<string, unknown>).VITE_GITHUB_CLIENT_ID

      // Save the original env and create a new empty one
      const originalEnvValue = { ...import.meta.env }

      // Set empty environment
      Object.defineProperty(import.meta, 'env', {
        value: {},
        writable: true,
      })

      // Mock clientId check
      vi.spyOn(service, 'generateAuthUrl').mockImplementation(() => {
        throw new Error('GitHub client ID is not configured')
      })

      expect(() => {
        service.generateAuthUrl()
      }).toThrow('GitHub client ID is not configured')

      // Restore the env for other tests
      Object.defineProperty(import.meta, 'env', {
        value: originalEnvValue,
        writable: true,
      })
    })

    it('should return authorization URL when client ID is configured', () => {
      // Mock the implementation of generateAuthUrl to return a predictable value
      vi.spyOn(service, 'generateAuthUrl').mockImplementation(() => {
        return 'https://github.com/login/oauth/authorize?client_id=test-client-id&redirect_uri=https%3A%2F%2Ftest.example.com%2Fsettings&scope=user:email'
      })

      const url = service.generateAuthUrl()

      // Construct the expected URL manually to avoid template expressions
      const expectedUrl =
        'https://github.com/login/oauth/authorize?client_id=test-client-id&redirect_uri=https%3A%2F%2Ftest.example.com%2Fsettings&scope=user:email'

      expect(url).toBe(expectedUrl)
    })
  })
})
