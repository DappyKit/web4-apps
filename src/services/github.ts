/**
 * GitHub service for handling GitHub account connections and interactions
 */

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
    if (error instanceof Error && typeof error.message === 'string') {
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
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new GitHubApiError(`Failed to get user info: ${String(response.status)}`)
      }

      const data = await response.json()
      assertIsGitHubUser(data)
      return data
    } catch (_err) {
      throw new GitHubApiError('Failed to get user info')
    }
  }

  /**
   * Generates GitHub authorization URL
   * @returns Authorization URL string
   * @throws {GitHubApiError} When client ID is not configured
   */
  generateAuthUrl(): string {
    // Get the GitHub client ID from environment variables
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID

    if (!clientId) {
      throw new GitHubApiError('GitHub client ID is not configured')
    }

    // Generate GitHub OAuth URL
    const redirectUri = `${window.location.origin}/settings`
    const encodedUri = encodeURIComponent(redirectUri)
    const clientIdStr = String(clientId)
    return (
      'https://github.com/login/oauth/authorize?client_id=' +
      clientIdStr +
      '&redirect_uri=' +
      encodedUri +
      '&scope=user:email'
    )
  }
}

export default GitHubService.getInstance()
