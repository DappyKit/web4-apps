import React, { useState, useEffect, useCallback } from 'react'
import { Row, Col, Container, Alert } from 'react-bootstrap'
import { useAppSelector } from '../redux/hooks'
import { selectAuth } from '../redux/reducers/authSlice'
import { getGitHubStatus, GitHubConnectionStatus } from '../services/api'
import GitHubConnection from '../components/GitHubConnection'

/**
 * Settings page component for user preferences
 * @returns React component
 */
export function Settings(): React.JSX.Element {
  const auth = useAppSelector(selectAuth)
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Validates if the string is a valid Ethereum address
   * @param address - Address to validate
   * @returns Boolean indicating if address is valid
   */
  const isValidEthAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  /**
   * Fetches GitHub connection status for the current user
   */
  const fetchGitHubStatus = useCallback(async (): Promise<void> => {
    if (!auth.isAuthenticated || !auth.address) {
      return
    }

    // Validate the address format before making the API call
    if (!isValidEthAddress(auth.address)) {
      setError('Invalid wallet address format')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const status = await getGitHubStatus(auth.address)
      setGithubStatus(status)
    } catch (error) {
      console.error('Error fetching GitHub status:', error)
      setError('Failed to load GitHub connection status')
    } finally {
      setLoading(false)
    }
  }, [auth.isAuthenticated, auth.address])

  // Fetch GitHub status on component mount and auth changes
  useEffect(() => {
    void fetchGitHubStatus()
  }, [fetchGitHubStatus])

  // Handler for status change that can be passed as a prop
  const handleStatusChange = useCallback(() => {
    void fetchGitHubStatus()
  }, [fetchGitHubStatus])

  return (
    <Container>
      <div className="d-flex justify-content-center flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1>Settings</h1>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {!auth.isAuthenticated ? (
        <Alert variant="warning">Please connect your wallet to manage your settings.</Alert>
      ) : (
        <Row>
          <Col md={8} className="mx-auto">
            <GitHubConnection
              githubStatus={githubStatus}
              address={auth.address}
              onStatusChange={handleStatusChange}
              isLoading={loading}
            />

            {/* Additional settings can be added here */}
          </Col>
        </Row>
      )}
    </Container>
  )
}
