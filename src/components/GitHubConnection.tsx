import React, { useState, useEffect } from 'react'
import { Card, Alert, Button, Spinner } from 'react-bootstrap'
import { connectGitHub, GitHubConnectionStatus, resetGitHubConnection } from '../services/api'

interface GitHubConnectionProps {
  githubStatus: GitHubConnectionStatus | null
  address: string
  onStatusChange: () => void
  isLoading: boolean
}

/**
 * Component for managing GitHub connection in the settings page
 * @param props - Component properties
 * @returns React component
 */
const GitHubConnection: React.FC<GitHubConnectionProps> = ({ githubStatus, address, onStatusChange, isLoading }) => {
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [resetSuccessful, setResetSuccessful] = useState(false)
  const [databaseError, setDatabaseError] = useState<boolean>(false)

  // Handle GitHub OAuth callback
  useEffect(() => {
    // Check if we're returning from GitHub OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const returnedState = urlParams.get('state')

    // If there's no code or address, we're not in an OAuth callback flow
    if (!code || !address) {
      return
    }

    // If we're already connected, just clean up the URL and exit
    if (githubStatus?.connected) {
      console.log('Already connected to GitHub, cleaning up URL')
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Validate state parameter to prevent CSRF attacks
    const storedState = sessionStorage.getItem('github_oauth_state')
    console.log('storedState', storedState, 'returnedState', returnedState)

    if (!storedState || storedState !== returnedState) {
      setError('Invalid authorization state. Please try again.')
      setConnecting(false)
      return
    }

    // Clear the stored state
    sessionStorage.removeItem('github_oauth_state')

    setConnecting(true)
    setError(null)

    const handleOAuthCallback = async (): Promise<void> => {
      try {
        // Exchange code for token
        const response = await fetch('/api/github/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          let errorMessage = 'Unknown error'
          try {
            const errorData = await response.json()
            if (errorData && typeof errorData === 'object' && 'error' in errorData) {
              errorMessage = typeof errorData.error === 'string' ? errorData.error : errorMessage
            }
          } catch {
            // If we can't parse the error response
            errorMessage = `HTTP error: ${response.status.toString()}`
          }

          console.error('GitHub code exchange failed:', {
            status: response.status,
            error: errorMessage,
          })
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const accessToken = data.access_token

        if (typeof accessToken === 'string') {
          // Connect GitHub account
          await connectGitHub(address, accessToken)
          onStatusChange()

          // Remove code param from URL to prevent re-authentication
          window.history.replaceState({}, document.title, window.location.pathname)
        } else {
          console.error('Invalid access token received:', data)
          setError('Invalid access token received')
        }
      } catch (error) {
        // Handle the error safely with proper type checking
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('GitHub connection error:', errorMessage)
        setError(errorMessage)
      } finally {
        setConnecting(false)
      }
    }

    void handleOAuthCallback()
  }, [address, onStatusChange, githubStatus])

  // Add emergency reset keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Listen for Alt+Shift+R to trigger emergency reset
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'r' && address) {
        console.log('Emergency GitHub connection reset triggered')

        // Use immediate function instead of async function
        void (async (): Promise<void> => {
          try {
            setConnecting(true)
            setError(null)
            setResetSuccessful(false)

            const result = await resetGitHubConnection(address)
            console.log('GitHub connection reset result: reset=', result.reset, 'rows=', result.rows_affected)

            setResetSuccessful(true)
            onStatusChange() // Refresh status

            // Hide success message after 3 seconds
            setTimeout(() => {
              setResetSuccessful(false)
            }, 3000)
          } catch (error) {
            // Handle the error safely with proper type checking
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('GitHub reset error:', errorMessage)
            setError(errorMessage || 'Failed to reset GitHub connection')
          } finally {
            setConnecting(false)
          }
        })()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [address, onStatusChange])

  /**
   * Handles GitHub connection
   */
  const handleConnect = (): void => {
    setConnecting(true)
    setError(null)

    try {
      // Get OAuth URL from server side to avoid exposing client ID
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID ?? ''
      if (!clientId) {
        setError('GitHub integration is not configured')
        setConnecting(false)
        return
      }

      // Generate a random state value for CSRF protection
      // Using a fallback for older browsers that don't support randomUUID
      let state: string
      try {
        state = crypto.randomUUID()
      } catch {
        state = Math.random().toString(36).substring(2, 15)
      }

      // Clear any previous state to avoid validation issues
      sessionStorage.removeItem('github_oauth_state')

      // Store state in sessionStorage for validation when returning from GitHub
      sessionStorage.setItem('github_oauth_state', state)
      console.log('Stored OAuth state for validation:', state)

      // Redirect to GitHub OAuth with state parameter
      const redirectUri = `${window.location.origin}/settings`
      const encodedRedirectUri = encodeURIComponent(redirectUri)
      // Safely build the auth URL with known string values
      let authUrl = 'https://github.com/login/oauth/authorize?'
      authUrl += 'client_id=' + String(clientId)
      authUrl += '&redirect_uri=' + String(encodedRedirectUri)
      authUrl += '&scope=user:email'
      authUrl += '&state=' + String(state)

      console.log('Redirecting to GitHub OAuth URL')
      window.location.href = authUrl
    } catch (error) {
      // Handle the error safely with proper type checking
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('GitHub authorization error:', errorMessage)
      setError('Failed to connect to GitHub')
      setConnecting(false)
    }
  }

  /**
   * Handles GitHub disconnection
   */
  const handleDisconnect = (): void => {
    if (!address) return

    setConnecting(true)
    setError(null)

    // Use void to handle the Promise properly
    void (async (): Promise<void> => {
      try {
        // Call the API directly to avoid any issues with the service
        const response = await fetch('/api/github/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address }),
        })

        if (!response.ok) {
          let errorMessage = 'Failed to disconnect GitHub account'
          setDatabaseError(false)
          try {
            const errorData = await response.json()
            if (errorData && typeof errorData === 'object' && 'error' in errorData) {
              errorMessage = typeof errorData.error === 'string' ? errorData.error : errorMessage

              // Check if it's a database error
              if (errorMessage.includes('Database error')) {
                console.log('Database error detected during disconnect')
                setDatabaseError(true)
              }
            }
          } catch {
            // If we can't parse the error response
            errorMessage = 'HTTP error: ' + response.status.toString()
          }
          console.error('GitHub disconnection error:', errorMessage)
          setError(errorMessage)
          setConnecting(false)

          // Try to refresh the state anyway in case the backend operation succeeded
          // but there was an issue with the response
          onStatusChange()
        } else {
          // Force state refresh regardless of response
          console.log('GitHub disconnection completed, refreshing state')
          onStatusChange()

          // Force UI refresh
          setTimeout(() => {
            setConnecting(false)
          }, 500)
        }
      } catch (error) {
        console.error('GitHub disconnection error:', error)
        setError(error instanceof Error ? error.message : 'Failed to disconnect GitHub account')
        setConnecting(false)

        // Try to refresh the state anyway in case the backend operation succeeded
        // but there was an issue with the response
        onStatusChange()
      }
    })()
  }

  const isConnected = githubStatus?.connected

  /**
   * Gets message text based on connection status
   */
  const getMessageText = (): string => {
    if (!isConnected) {
      return 'Connect your GitHub account to access additional features and streamline your development workflow.'
    }

    // At this point, we know isConnected is true and githubStatus is not null
    return `Your account is connected to GitHub as @${githubStatus.github_username ?? ''}`
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">GitHub Connection</h5>
      </Card.Header>
      <Card.Body>
        {error && !databaseError && <Alert variant="danger">{error}</Alert>}
        {databaseError && (
          <Alert variant="danger">
            Database error during disconnect operation. Your GitHub token has been revoked but there was an issue
            updating your profile. Please try again.
          </Alert>
        )}
        {resetSuccessful && <Alert variant="success">GitHub connection has been reset successfully</Alert>}

        <div className="mb-3">
          <p className="text-break">{getMessageText()}</p>
        </div>

        <div className="d-flex align-items-center flex-wrap">
          {isConnected ? (
            <Button
              variant="outline-danger"
              onClick={handleDisconnect}
              disabled={connecting || isLoading}
              className="d-flex align-items-center w-100 w-md-auto justify-content-center"
            >
              {(connecting || isLoading) && (
                <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
              )}
              Disconnect GitHub
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={connecting || isLoading}
              className="d-flex align-items-center w-100 w-md-auto justify-content-center"
            >
              {(connecting || isLoading) && (
                <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
              )}
              Connect GitHub
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}

export default GitHubConnection
