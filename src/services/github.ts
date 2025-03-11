/**
 * GitHub service for handling GitHub account connections and interactions
 */

import axios, { AxiosError } from 'axios'

/**
 * GitHub API response types
 */
export interface GitHubUser {
  login: string
  name: string
  email: string
}

export class GitHubApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubApiError'
  }

  static fromError(error: Error): GitHubApiError {
    if (error instanceof GitHubApiError) {
      return error
    }
    if (error instanceof AxiosError && typeof error.message === 'string') {
      const message = error.message.replace(/[^\w\s-]/g, '')
      return new GitHubApiError(`GitHub API request failed: ${message}`)
    }
    return new GitHubApiError('Failed to get user info')
  }
}

function assertIsGitHubUser(data: unknown): asserts data is GitHubUser {
  if (!data || typeof data !== 'object') {
    throw new GitHubApiError('Invalid user data')
  }

  const user = data as Record<string, unknown>
  if (typeof user.login !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string') {
    throw new GitHubApiError('Invalid user data structure')
  }
}

/**
 * Service for handling GitHub account connections and interactions
 */
export class GitHubService {
  private static instance: GitHubService | null = null

  /**
   * Get singleton instance of GitHubService
   */
  public static getInstance(): GitHubService {
    if (!GitHubService.instance) {
      GitHubService.instance = new GitHubService()
    }
    return GitHubService.instance
  }

  /**
   * Retrieves user information from GitHub API
   * @param accessToken - GitHub access token
   * @returns Promise with GitHub user information
   * @throws {GitHubApiError} When access token is missing or API request fails
   */
  async getUserInfo(accessToken: string): Promise<GitHubUser> {
    if (!accessToken) {
      throw new GitHubApiError('Access token is required')
    }

    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      assertIsGitHubUser(response.data)
      return response.data
    } catch (_err) {
      throw new GitHubApiError('Failed to get user info')
    }
  }

  /**
   * Generates GitHub authorization URL
   * @returns Authorization URL string
   * @throws {GitHubApiError} When client ID is not configured
   */
  getAuthorizationUrl(): string {
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) {
      throw new GitHubApiError('GitHub client ID is not configured')
    }

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`
  }
}

export default GitHubService.getInstance()
