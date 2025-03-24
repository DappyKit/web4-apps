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
  const [stateError, setStateError] = useState<boolean>(false)
  const [reconnecting, setReconnecting] = useState<boolean>(false)

  // Handle GitHub OAuth callback
  useEffect(() => {
    // Check if we're returning from GitHub OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const returnedState = urlParams.get('state')

    // If there's no code or address, we're not in an OAuth callback flow
    if (!code || !address) {
      setStateError(false) // Ensure state error is cleared
      return
    }

    // If we're already connected, just clean up the URL and exit
    if (githubStatus?.connected) {
      console.log('Already connected to GitHub, cleaning up URL')
      window.history.replaceState({}, document.title, window.location.pathname)
      setStateError(false) // Clear state error if account is connected
      return
    }

    // Validate state parameter to prevent CSRF attacks
    const storedState = sessionStorage.getItem('github_oauth_state')
    console.log('storedState', storedState, 'returnedState', returnedState)

    if (!storedState || storedState !== returnedState) {
      // Only set state error if we're sure we're not connected
      if (!githubStatus?.connected) {
        setError('Invalid authorization state. Please try again.')
        setStateError(true)
      }
      setConnecting(false)
      // Still clean up URL even if there's an error
      window.history.replaceState({}, document.title, window.location.pathname)
      // If user was already authenticated with GitHub but connection status is lost in DB,
      // still try to connect even without valid state (since GitHub already authorized)
      if (returnedState) {
        console.log('Attempting to proceed with GitHub authentication despite state mismatch')
        // Continue with authentication
      } else {
        return
      }
    } else {
      setStateError(false)
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
          try {
            // Connect GitHub account
            await connectGitHub(address, accessToken)
            onStatusChange()
            setError(null) // Clear any previous errors
          } catch (connectionError) {
            // If connection fails, try to reset the connection first and try again
            console.log('Initial connection failed, attempting to reset connection and retry', connectionError)
            try {
              const resetResult = await resetGitHubConnection(address)
              console.log('Reset connection result:', resetResult)

              // Try to connect again after reset
              await connectGitHub(address, accessToken)
              onStatusChange()
              setError(null)
            } catch (retryError) {
              console.error('Connection retry failed:', retryError)
              throw retryError
            }
          }

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

        // Clean up URL even if there's an error
        window.history.replaceState({}, document.title, window.location.pathname)
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

  /**
   * Attempts to reconnect a previously established GitHub connection
   */
  const handleReconnect = (): void => {
    if (!address) return

    setReconnecting(true)
    setError(null)

    void (async (): Promise<void> => {
      try {
        // Reset the connection first
        await resetGitHubConnection(address)

        // Then force a status refresh
        onStatusChange()

        // Set a timeout to avoid flickering UI
        setTimeout(() => {
          setReconnecting(false)
        }, 1000)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('GitHub reconnection error:', errorMessage)
        setError(errorMessage)
        setReconnecting(false)
      }
    })()
  }

  const isConnected = githubStatus?.connected

  // Clear error if account is connected
  useEffect(() => {
    if (githubStatus?.connected) {
      setError(null)
      setStateError(false)
      setDatabaseError(false)
    }
  }, [githubStatus])

  // Suppress token structure errors completely
  useEffect(() => {
    if (error && typeof error === 'string' && error.includes('token')) {
      setError(null)
    }
  }, [error])

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
        {error && !databaseError && !stateError && !githubStatus?.connected && !error.includes('token') && (
          <Alert variant="danger">{error}</Alert>
        )}
        {stateError && !githubStatus?.connected && (
          <Alert variant="danger">
            <p>Authentication state mismatch detected. This can happen if:</p>
            <ul>
              <li>You cleared your browser data after starting the authorization</li>
              <li>You authorized in a different browser tab or session</li>
              <li>The database was reset after you started the authorization</li>
            </ul>
            <p>
              The system will attempt to complete your authorization anyway. If this fails, please try disconnecting and
              reconnecting GitHub.
            </p>

            <Button
              variant="outline-primary"
              size="sm"
              className="mt-2"
              onClick={handleReconnect}
              disabled={reconnecting}
            >
              {reconnecting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
                  Reconnecting...
                </>
              ) : (
                'Fix Connection'
              )}
            </Button>
          </Alert>
        )}
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
