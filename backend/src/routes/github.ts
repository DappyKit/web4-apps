import { Router } from 'express'
import { Knex } from 'knex'
import { User } from '../types'
import crypto from 'crypto'

export class GitHubError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubError'
  }

  static fromError(error: Error): GitHubError {
    if (error instanceof GitHubError) {
      return error
    }
    if (error instanceof Error && typeof error.message === 'string') {
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

interface GitHubUserResponse {
  login: string
  name: string
  email: string
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

function assertIsGitHubUserResponse(data: unknown): asserts data is GitHubUserResponse {
  if (!data || typeof data !== 'object') {
    throw new GitHubError('Invalid GitHub user data')
  }

  const user = data as Record<string, unknown>
  if (typeof user.login !== 'string') {
    throw new GitHubError('Invalid GitHub user data structure')
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - Data to encrypt
 * @returns Encrypted data as a string
 */
function encryptData(text: string): string {
  try {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey || encryptionKey.length < 32) {
      console.error('Encryption key is missing or too short - fallback to plain storage')
      return text
    }

    const iv = crypto.randomBytes(16)
    const key = crypto.createHash('sha256').update(String(encryptionKey)).digest('base64').slice(0, 32)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag().toString('hex')

    // Return iv:authTag:encrypted format
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
  } catch (error) {
    console.error('Encryption failed, falling back to plain storage:', error)
    return text
  }
}

/**
 * Decrypts data that was encrypted using AES-256-GCM
 * @param encryptedText - Text to decrypt in iv:authTag:encrypted format
 * @returns Decrypted string or null if decryption fails
 */
function decryptData(encryptedText: string): string | null {
  try {
    // Check if the text is in encrypted format
    if (!encryptedText.includes(':')) {
      // Likely not encrypted, return as is (for backward compatibility)
      return encryptedText
    }

    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey || encryptionKey.length < 32) {
      console.error('Encryption key is missing or too short')
      return null
    }

    const [ivHex, authTagHex, encrypted] = encryptedText.split(':')

    // Ensure all required values are present
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted format')
    }

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = crypto.createHash('sha256').update(String(encryptionKey)).digest('base64').slice(0, 32)

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    // Use Buffer for consistent types
    const decryptedBuffer = Buffer.concat([decipher.update(encrypted, 'hex'), decipher.final()])

    return decryptedBuffer.toString('utf8')
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
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
    console.error('GitHub OAuth configuration missing:', {
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret,
    })
    throw new GitHubError('GitHub client credentials are not configured')
  }

  try {
    console.log('Exchanging GitHub code for token...')

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    if (!response.ok) {
      console.error('GitHub token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
      })
      throw new GitHubError(`Failed to exchange code for token: ${response.status.toString()}`)
    }

    const data = await response.json()
    console.log('GitHub token exchange response received')

    assertIsTokenResponse(data)
    return data
  } catch (error) {
    console.error('GitHub token exchange error:', error)
    throw GitHubError.fromError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Fetches GitHub user information using an access token
 * @param accessToken - GitHub API access token
 * @returns Promise with GitHub user data
 * @throws {GitHubError} When access token is invalid or request fails
 */
async function getGitHubUserInfo(accessToken: string): Promise<GitHubUserResponse> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new GitHubError(`Failed to get GitHub user info: ${response.status.toString()}`)
    }

    const data = await response.json()
    assertIsGitHubUserResponse(data)
    return data
  } catch (_err) {
    throw new GitHubError('Failed to get GitHub user information')
  }
}

/**
 * Revokes a GitHub access token
 * @param accessToken - GitHub access token to revoke
 * @returns Promise<boolean> indicating success
 */
async function revokeGitHubToken(accessToken: string): Promise<boolean> {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret || !accessToken) {
    console.error('Missing credentials for token revocation:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasAccessToken: !!accessToken,
    })
    return false
  }

  try {
    console.log('Attempting to revoke GitHub token...')

    // GitHub token revocation endpoint
    // See: https://docs.github.com/en/rest/apps/oauth-applications#delete-an-app-token
    const response = await fetch(`https://api.github.com/applications/${clientId}/token`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({ access_token: accessToken }),
    })

    console.log('GitHub token revocation response:', {
      status: response.status,
      statusText: response.statusText,
    })

    if (response.status === 204) {
      return true // No content = success
    }

    // For other status codes, we still want to proceed with disconnection
    // Token might be already invalid or expired
    if (response.status === 404 || response.status === 401) {
      console.log('Token might be already invalid or expired, proceeding with disconnection')
      return false
    }

    // Try to get response body for error details
    try {
      const errorData = await response.text()
      console.error('GitHub token revocation error response:', errorData)
    } catch (e) {
      console.error('Could not read error response body')
    }

    return false
  } catch (error) {
    console.error('Error revoking GitHub token:', error)
    return false
  }
}

/**
 * Creates GitHub router with database connection
 * @param db - Knex database instance
 * @returns Express router
 */
export function createGitHubRouter(db: Knex): Router {
  const router = Router()

  // NOTE: Rate limiting has been removed to prevent "Too many requests" errors

  router.post('/exchange', async (req, res) => {
    const { code } = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is required' })
    }

    try {
      console.log('Received GitHub code exchange request')
      const tokenResponse = await exchangeCodeForToken(code)
      return res.json(tokenResponse)
    } catch (error) {
      console.error('GitHub code exchange error in route handler:', error)

      // Send a more descriptive error message
      if (error instanceof GitHubError) {
        return res.status(400).json({ error: error.message })
      }

      return res.status(400).json({
        error: 'Failed to exchange code for token',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  router.post('/connect', async (req, res) => {
    const { address, accessToken } = req.body

    if (!address || !accessToken) {
      return res.status(400).json({ error: 'Address and access token are required' })
    }

    try {
      // Get GitHub user info
      const githubUser = await getGitHubUserInfo(String(accessToken))

      // Encrypt the token before storing
      const encryptedToken = encryptData(String(accessToken))

      // Update user record with GitHub info
      await db<User>('users')
        .where({ address: String(address).toLowerCase() })
        .update({
          github_token: encryptedToken,
          github_username: githubUser.login,
          github_name: githubUser.name || undefined,
          github_email: githubUser.email || undefined,
          github_connected_at: db.fn.now(),
        })

      // Return GitHub username to confirm connection
      return res.json({
        connected: true,
        github_username: githubUser.login,
      })
    } catch (error) {
      console.error('Error connecting GitHub account:', error)
      return res.status(400).json({ error: 'Failed to connect GitHub account' })
    }
  })

  router.post('/disconnect', async (req, res) => {
    const { address } = req.body

    if (!address) {
      return res.status(400).json({ error: 'Address is required' })
    }

    console.log(`Disconnecting GitHub for address: ${String(address)}`)

    try {
      // Get current user data to access the token for revocation
      const user = await db<User>('users')
        .where({ address: String(address).toLowerCase() })
        .first()

      if (!user) {
        console.error(`User not found: ${String(address)}`)
        return res.status(404).json({ error: 'User not found' })
      }

      const userGithubName = user.github_username || 'none'
      console.log(`Found user record for: ${String(address)}, GitHub username: ${String(userGithubName)}`)

      let revocationSuccess = false
      if (user.github_token) {
        // Decrypt token if it exists
        const decryptedToken = decryptData(user.github_token)

        if (decryptedToken) {
          // Attempt to revoke the token
          console.log('Attempting to revoke GitHub token')
          revocationSuccess = await revokeGitHubToken(decryptedToken)

          if (!revocationSuccess) {
            console.warn('Failed to revoke GitHub token, but will still disconnect account')
          }
        } else {
          console.warn('Failed to decrypt GitHub token, but will still disconnect account')
        }
      } else {
        console.log('No GitHub token found for user')
      }

      console.log('Updating user record to remove GitHub connection')

      // Always update user record to remove GitHub info, even if revocation failed
      try {
        // First, build a valid update object with explicit null values
        const updateFields: Record<string, null> = {
          github_token: null,
          github_username: null,
          github_name: null,
          github_email: null,
          github_connected_at: null,
        }

        // Update user record
        const result = await db<User>('users')
          .where({ address: String(address).toLowerCase() })
          .update(updateFields)

        console.log(`Database update result: ${String(result)} rows affected`)

        if ((result as number) === 0) {
          console.error('No rows updated in database')
          return res.status(500).json({ error: 'Failed to update user record' })
        }

        return res.json({
          disconnected: true,
          token_revoked: revocationSuccess,
        })
      } catch (dbError) {
        console.error('Database error while disconnecting GitHub:', dbError)
        return res.status(500).json({ error: 'Database error during disconnect operation' })
      }
    } catch (error) {
      console.error('Error disconnecting GitHub account:', error)
      return res.status(500).json({ error: 'Failed to disconnect GitHub account' })
    }
  })

  router.get('/status/:address', async (req, res) => {
    const { address } = req.params

    if (!address) {
      return res.status(400).json({ error: 'Address is required' })
    }

    // Validate address format (should be a valid Ethereum address)
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' })
    }

    try {
      console.log(`Checking GitHub status for address: ${String(address)}`)

      // Get user GitHub connection status
      const user = await db<User>('users')
        .where({ address: String(address).toLowerCase() })
        .first()

      if (!user) {
        console.log(`User not found: ${String(address)}`)
        return res.status(404).json({ error: 'User not found' })
      }

      const isConnected = !!user.github_username
      const usernameStr = user.github_username ? String(user.github_username) : 'none'

      console.log(
        `GitHub status for ${String(address)}: ${isConnected ? 'Connected' : 'Not connected'}${isConnected ? ` as ${usernameStr}` : ''}`,
      )

      return res.json({
        connected: isConnected,
        github_username: user.github_username || null,
        last_connected: user.github_connected_at || null,
      })
    } catch (error) {
      console.error('Error checking GitHub connection status:', error)
      return res.status(500).json({ error: 'Failed to check GitHub connection status' })
    }
  })

  // Add a special endpoint to forcefully reset GitHub connection (for admin/debugging)
  router.post('/reset-connection', async (req, res) => {
    const { address } = req.body

    if (!address) {
      return res.status(400).json({ error: 'Address is required' })
    }

    try {
      console.log(`Force-resetting GitHub connection for address: ${String(address)}`)

      // Get user data to check what needs updating
      const user = await db<User>('users')
        .where({ address: String(address).toLowerCase() })
        .first()

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Update user record with null values
      const updateFields: Record<string, null> = {
        github_token: null,
        github_username: null,
        github_name: null,
        github_email: null,
        github_connected_at: null,
      }

      // Update user record to remove GitHub info with a direct update
      // This is a forceful reset that bypasses token revocation
      const result = await db<User>('users')
        .where({ address: String(address).toLowerCase() })
        .update(updateFields)

      console.log(`Database reset result: ${String(result)} rows affected`)

      return res.json({
        reset: true,
        rows_affected: result,
      })
    } catch (error) {
      console.error('Error resetting GitHub connection:', error)
      return res.status(500).json({ error: 'Failed to reset GitHub connection' })
    }
  })

  return router
}
