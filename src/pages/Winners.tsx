import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Container, Spinner, Table } from 'react-bootstrap'
import { getWinners, WinnersResponse } from '../services/api'

/**
 * Winners page component that displays tier 1 and tier 2 winners
 * @returns JSX element
 */
export function Winners(): React.JSX.Element {
  const [winnersData, setWinnersData] = useState<WinnersResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchWinners()
  }, [])

  /**
   * Fetches winners data from the API
   */
  const fetchWinners = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWinners()
      setWinnersData(data)
    } catch (error) {
      console.error('Error fetching winners:', error)
      setError('Failed to load winners data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Exports winners data to CSV
   */
  const exportToCSV = (): void => {
    if (!winnersData) return

    // Prepare CSV content
    const headers = ['Address', 'Win Amount']
    const winnerRows = winnersData.winners.map(winner => `${winner.address},${winner.win_1_amount}`)

    const csvContent = [headers.join(','), ...winnerRows].join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'winners.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Web4 Winners</h1>
        <Button variant="success" onClick={exportToCSV} disabled={!winnersData || loading}>
          Export to CSV
        </Button>
      </div>

      {loading && (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && winnersData && (
        <>
          {/* Grand Prix Winners */}
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h2 className="h4 mb-0">Grand Prix Winners</h2>
            </Card.Header>
            <Card.Body>
              {winnersData.winners.length === 0 ? (
                <Alert variant="info">No winners at the moment.</Alert>
              ) : (
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
                    {winnersData.winners.map((winner, index) => (
                      <tr key={`winner-${String(index)}`}>
                        <td className="border-0">{index + 1}</td>
                        <td className="border-0">{winner.address}</td>
                        <td className="border-0 text-center">{winner.win_1_amount} L</td>
                        <td className="border-0 text-end fw-bold">{winner.app_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Apps Creators */}
          <Card>
            <Card.Header className="bg-secondary text-white">
              <h2 className="h4 mb-0">Apps Creators</h2>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">No winners at the moment for Apps Creators.</Alert>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  )
}
