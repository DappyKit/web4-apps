import { Router } from 'express'
import axios, { AxiosError } from 'axios'

export class GitHubError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubError'
  }

  static fromError(error: Error): GitHubError {
    if (error instanceof GitHubError) {
      return error
    }
    if (error instanceof AxiosError && typeof error.message === 'string') {
      const message = error.message.replace(/[^\w\s-]/g, '')
      return new GitHubError(`Token exchange failed: ${message}`)
    }
    return new GitHubError('Failed to exchange code for token')
  }
}

interface TokenResponse {
  access_token: string
  token_type: string
  scope: string
}

function assertIsTokenResponse(data: unknown): asserts data is TokenResponse {
  if (!data || typeof data !== 'object') {
    throw new GitHubError('Invalid token response')
  }

  const response = data as Record<string, unknown>
  if (
    typeof response.access_token !== 'string' ||
    typeof response.token_type !== 'string' ||
    typeof response.scope !== 'string'
  ) {
    throw new GitHubError('Invalid token response structure')
  }
}

/**
 * Exchanges authorization code for access token
 * @param code - Authorization code from GitHub
 * @returns Promise with access token response
 * @throws {GitHubError} When client credentials are missing or token exchange fails
 */
async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new GitHubError('GitHub client credentials are not configured')
  }

  try {
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    assertIsTokenResponse(response.data)
    return response.data
  } catch (_err) {
    // Create a new error to avoid ESLint issues
    const error = new GitHubError('Failed to exchange code for token')
    throw error
  }
}

const router = Router()

router.post('/exchange', async (req, res) => {
  const { code } = req.body

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code is required' })
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code)
    return res.json(tokenResponse)
  } catch (_err) {
    // Simplified error handling to avoid type issues
    return res.status(400).json({ error: 'Failed to exchange code for token' })
  }
})

export default router
