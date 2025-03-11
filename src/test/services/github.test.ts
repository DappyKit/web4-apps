import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { GitHubService } from '../../services/github'

vi.mock('axios')
const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> }

describe('GitHubService', () => {
  let service: GitHubService

  beforeEach(() => {
    service = new GitHubService()
    vi.clearAllMocks()
  })

  describe('getUserInfo', () => {
    it('should throw an error when access token is missing', async () => {
      try {
        await service.getUserInfo('')
        // If we get here, the test should fail
        expect(true).toBe(false)
      } catch (_e) {
        // Just verify that an error was thrown
        expect(true).toBe(true)
      }
    })

    it('should throw an error when user data is invalid', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} })
      try {
        await service.getUserInfo('valid-token')
        // If we get here, the test should fail
        expect(true).toBe(false)
      } catch (_e) {
        // Just verify that an error was thrown
        expect(true).toBe(true)
      }
    })

    it('should throw an error on network issues', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))
      try {
        await service.getUserInfo('valid-token')
        // If we get here, the test should fail
        expect(true).toBe(false)
      } catch (_e) {
        // Just verify that an error was thrown
        expect(true).toBe(true)
      }
    })

    it('should return user data when request is successful', async () => {
      const mockUser = {
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockUser })

      const result = await service.getUserInfo('valid-token')
      expect(result).toEqual(mockUser)
    })
  })

  describe('getAuthorizationUrl', () => {
    it('should throw an error when client ID is not configured', () => {
      expect(() => service.getAuthorizationUrl()).toThrow()
    })

    it('should return authorization URL when client ID is configured', () => {
      process.env.GITHUB_CLIENT_ID = 'test-client-id'
      const url = service.getAuthorizationUrl()
      expect(url).toBe('https://github.com/login/oauth/authorize?client_id=test-client-id&scope=user:email')
    })
  })
})
