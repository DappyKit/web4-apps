import { useState, useEffect } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { getAllApps, type App, type PaginatedAppsResponse } from '../services/api'
import { AppList } from '../components/AppList'
import { Pagination } from '../components/Pagination'

export function AllApps(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 12
  })

  // Fetch apps with pagination
  const fetchApps = async (page: number): Promise<void> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response: PaginatedAppsResponse = await getAllApps(page, pagination.limit)
      
      setApps(response.data)
      setPagination({
        currentPage: response.pagination.page,
        totalPages: response.pagination.totalPages,
        totalItems: response.pagination.total,
        limit: response.pagination.limit
      })
    } catch (err) {
      console.error('Error fetching apps:', err)
      setError('Failed to load apps. Please try again later.')
      setApps([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number): void => {
    // Only fetch if the page actually changed
    if (page !== pagination.currentPage) {
      window.scrollTo(0, 0) // Scroll to top when changing pages
      void fetchApps(page)
    }
  }

  // Initial fetch - only run on component mount
  // We're intentionally using an empty dependency array since we only want this to run once
  // The eslint rule for exhaustive-deps is disabled inline to prevent unwanted re-fetch loops
  useEffect(() => {
    void fetchApps(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">All Apps</h1>
          <p className="text-center text-muted">
            Browse all moderated apps from our community
          </p>
          {error && <div className="alert alert-danger">{error}</div>}
        </Col>
      </Row>

      <Row>
        <Col>
          <AppList 
            apps={apps} 
            isLoading={isLoading} 
            showEmptyMessage="No apps available at the moment."
          />

          {!isLoading && !error && (
            <Pagination 
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </Col>
      </Row>
    </Container>
  )
}
