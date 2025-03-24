import React, { useState, useEffect } from 'react'
import { Button, Card, Typography, Box, CircularProgress } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import githubService from '../services/github'

interface GitHubConnectProps {
  onConnect?: (accessToken: string) => void
  onDisconnect?: () => void
  isConnected?: boolean
}

/**
 * Component for connecting to GitHub
 * @param props - Component props
 * @returns React component
 */
const GitHubConnect: React.FC<GitHubConnectProps> = ({ onConnect, onDisconnect, isConnected = false }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we're returning from GitHub OAuth
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      // Define the callback function inside the useEffect
      const handleCallback = async (): Promise<void> => {
        setLoading(true)
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
            throw new Error('Failed to exchange code for token')
          }

          const data = await response.json()
          // Add type assertion to ensure access_token is a string
          const accessToken = data.access_token
          if (onConnect && typeof accessToken === 'string') {
            onConnect(accessToken)
          } else {
            setError('Invalid access token received')
          }
        } catch (error) {
          // Use the error variable
          console.error('GitHub connection error:', error)
          setError('Failed to connect to GitHub')
        } finally {
          setLoading(false)
        }
      }

      // Call the function
      void handleCallback()
    }
  }, [onConnect])

  /**
   * Handles the GitHub connect button click
   */
  const handleConnect = (): void => {
    setLoading(true)
    try {
      const authUrl = githubService.generateAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      // Use the error variable
      console.error('GitHub authorization error:', error)
      setError('Failed to generate authorization URL')
      setLoading(false)
    }
  }

  /**
   * Handles the GitHub disconnect button click
   */
  const handleDisconnect = (): void => {
    if (onDisconnect) {
      onDisconnect()
    }
  }

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        GitHub Connection
      </Typography>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isConnected ? (
          <Button
            variant="outlined"
            color="error"
            startIcon={<GitHubIcon />}
            onClick={handleDisconnect}
            disabled={loading}
          >
            Disconnect GitHub
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<GitHubIcon />}
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Connect GitHub'}
          </Button>
        )}
      </Box>
    </Card>
  )
}

export default GitHubConnect
