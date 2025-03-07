import { useEffect, useState } from 'react'
import { Card, Container, Table, Spinner, Alert, Badge } from 'react-bootstrap'
import { getUsersWithAppCounts, TopCreatorsResponse } from '../services/api'
import { useAppSelector } from '../redux/hooks'
import { selectAuth } from '../redux/reducers/authSlice'

/**
 * Component that displays users who have created at least one app,
 * sorted by the number of apps created
 */
export function TopAppCreators(): React.JSX.Element {
  const auth = useAppSelector(selectAuth)
  const [topCreators, setTopCreators] = useState<TopCreatorsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      try {
        setLoading(true)
        // If authenticated, pass the user's address to API
        const data = auth.isAuthenticated ? await getUsersWithAppCounts(auth.address) : await getUsersWithAppCounts()

        setTopCreators(data)
        setError(null)
      } catch (err) {
        setError('Failed to load app creators. Please try again later.')
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    void fetchUsers()
  }, [auth.isAuthenticated, auth.address])

  // Generate placeholder rows if we have fewer than 100 users
  const generatePlaceholders = (): { key: string; isPlaceholder: boolean }[] => {
    if (!topCreators?.users || topCreators.users.length >= 100) return []

    const placeholders = []
    for (let i = 0; i < 100 - topCreators.users.length; i++) {
      placeholders.push({
        key: `placeholder-${String(i)}`,
        isPlaceholder: true,
      })
    }
    return placeholders
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Top App Creators</h1>

      {loading && (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && topCreators?.users.length === 0 && <Alert variant="info">No users with apps found.</Alert>}

      {/* User's position if they're not in top 100 but have created apps */}
      {!loading && !error && topCreators?.user_record && !topCreators.users.some(user => user.is_user) && (
        <Card className="mb-4 border-primary">
          <Card.Header className="bg-primary text-white">Your Position</Card.Header>
          <Card.Body>
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th className="border-0">#</th>
                  <th className="border-0">Wallet Address</th>
                  <th className="border-0 text-center">Win Amount</th>
                  <th className="border-0 text-end">Apps Created</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-0">{topCreators.user_record.rank}</td>
                  <td className="border-0">
                    {topCreators.user_record.trimmed_address}
                    <Badge bg="primary" className="ms-2">
                      You
                    </Badge>
                  </td>
                  <td className="border-0 text-center">
                    {topCreators.user_record.win_1_amount ? `${topCreators.user_record.win_1_amount} L` : '-'}
                  </td>
                  <td className="border-0 text-end fw-bold">{topCreators.user_record.app_count}</td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {!loading && !error && topCreators?.users && topCreators.users.length > 0 && (
        <Card>
          <Card.Body>
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th className="border-0">#</th>
                  <th className="border-0">Wallet Address</th>
                  <th className="border-0 text-center">Win Amount</th>
                  <th className="border-0 text-end">Apps Created</th>
                </tr>
              </thead>
              <tbody>
                {topCreators.users.map((user, index) => (
                  <tr key={`user-${String(index)}`} className={user.is_user ? 'table-primary' : ''}>
                    <td className="border-0">{index + 1}</td>
                    <td className="border-0">
                      {user.trimmed_address}
                      {user.is_user && (
                        <Badge bg="primary" className="ms-2">
                          You
                        </Badge>
                      )}
                    </td>
                    <td className="border-0 text-center">{user.win_1_amount ? `${user.win_1_amount} L` : '-'}</td>
                    <td className="border-0 text-end fw-bold">{user.app_count}</td>
                  </tr>
                ))}

                {/* Placeholder rows */}
                {generatePlaceholders().map((placeholder, index) => (
                  <tr key={placeholder.key} className="text-muted">
                    <td className="border-0">{topCreators.users.length + index + 1}</td>
                    <td className="border-0 fst-italic">You could be here</td>
                    <td className="border-0 text-center fst-italic">-</td>
                    <td className="border-0 text-end fst-italic">Create an app to join!</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      <div className="mt-4">
        <p className="text-muted small">
          Showing top app creators sorted by the number of apps they&apos;ve created. Create your own apps to join this
          leaderboard!
        </p>
        {!auth.isAuthenticated && (
          <p className="text-muted small">
            <a href="/">Connect your wallet</a> to see your position in the rankings.
          </p>
        )}
      </div>
    </Container>
  )
}
