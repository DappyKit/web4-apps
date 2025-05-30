import { useEffect, useState } from 'react'
import { Card, Table, Spinner, Alert, Badge } from 'react-bootstrap'
import { getUsersWithAppCounts, TopCreatorsResponse } from '../services/api'
import { useAppSelector } from '../redux/hooks'
import { selectAuth } from '../redux/reducers/authSlice'
import { Link } from 'react-router-dom'
import { useSubmissionsStatus } from '../hooks/useSubmissionsStatus'

/**
 * Component that displays users who have created at least one app,
 * sorted by the number of apps created
 */
export function TopAppCreators(): React.JSX.Element {
  const auth = useAppSelector(selectAuth)
  const { areSubmissionsEnabled } = useSubmissionsStatus()
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

  // Generate placeholder rows if we have fewer than 200 users
  const generatePlaceholders = (): { key: string; isPlaceholder: boolean }[] => {
    if (!topCreators?.users || topCreators.users.length >= 200) return []

    const placeholders = []
    for (let i = 0; i < 200 - topCreators.users.length; i++) {
      placeholders.push({
        key: `placeholder-${String(i)}`,
        isPlaceholder: true,
      })
    }
    return placeholders
  }

  return (
    <div>
      <div className="d-flex justify-content-center flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1>Top App Creators</h1>
      </div>

      <Alert variant="info" className="mb-4">
        <h5>Rewards Program</h5>
        <p>Top 200 creators receive 50 OP tokens each. Deadline: June 1, 2025.</p>
        <p className="mb-0">Only moderated apps count.</p>
        {!areSubmissionsEnabled && (
          <p className="mb-0 mt-2 text-warning">
            <strong>
              Submissions are currently locked until calculation of hackathon results. Thank you for participation!
            </strong>
          </p>
        )}
      </Alert>

      {!auth.isAuthenticated && (
        <Alert variant="warning" className="mb-4">
          <Link to="/" className="alert-link">
            Go to main page
          </Link>{' '}
          to connect your wallet and see your position in the rankings.
        </Alert>
      )}

      {loading && (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {/* User's position if they're not in top 100 but have created apps */}
      {auth.isAuthenticated &&
        !loading &&
        !error &&
        topCreators?.user_record &&
        !topCreators.users.some(user => user.is_user) && (
          <Card className="mb-4 border-primary">
            <Card.Header className="bg-primary text-white">Your Position</Card.Header>
            <Card.Body>
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th className="border-0">#</th>
                    <th className="border-0">Wallet Address</th>
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
                    <td className="border-0 text-end fw-bold">{user.app_count}</td>
                  </tr>
                ))}

                {/* Placeholder rows */}
                {generatePlaceholders().map((placeholder, index) => (
                  <tr key={placeholder.key} className="text-muted">
                    <td className="border-0">{topCreators.users.length + index + 1}</td>
                    <td className="border-0 fst-italic">You could be here</td>
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
          leaderboard and earn rewards!
        </p>
      </div>
    </div>
  )
}
