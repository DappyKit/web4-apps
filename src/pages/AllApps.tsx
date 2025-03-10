import { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { getAllApps, type App, type PaginatedAppsResponse } from '../services/api'
import { AppList } from '../components/AppList'
import { Pagination } from '../components/Pagination'
import { useSearchParams } from 'react-router-dom'

export function AllApps(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get current page from URL or default to 1
  const initialPage = Number(searchParams.get('page') ?? 1)

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    apps: App[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      limit: number
    }
  }>({
    apps: [],
    pagination: {
      currentPage: initialPage,
      totalPages: 1,
      totalItems: 0,
      limit: 12,
    },
  })

  // Fetch apps with pagination
  const fetchApps = useCallback(
    async (page: number): Promise<void> => {
      if (page === data.pagination.currentPage && data.apps.length > 0) {
        return // Prevent duplicate fetches for the same page
      }

      // Only show loading state on initial load
      if (data.apps.length === 0) {
        setIsInitialLoading(true)
      }
      setError(null)

      try {
        const response: PaginatedAppsResponse = await getAllApps(page, data.pagination.limit)

        setData({
          apps: response.data,
          pagination: {
            currentPage: response.pagination.page,
            totalPages: response.pagination.totalPages,
            totalItems: response.pagination.total,
            limit: response.pagination.limit,
          },
        })
      } catch (err) {
        console.error('Error fetching apps:', err)
        setError('Failed to load apps. Please try again later.')
      } finally {
        setIsInitialLoading(false)
      }
    },
    [data.pagination.currentPage, data.pagination.limit, data.apps.length],
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number): void => {
      if (page !== data.pagination.currentPage) {
        setSearchParams({ page: String(page) }, { replace: true })
        void fetchApps(page)
      }
    },
    [data.pagination.currentPage, fetchApps, setSearchParams],
  )

  // Initial fetch when component mounts or URL changes
  useEffect(() => {
    void fetchApps(initialPage)
  }, [initialPage, fetchApps])

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">All Apps</h1>
          <p className="text-center text-muted">
            Browse all moderated apps from our community. Get inspired by what others have built.
          </p>
          {error && <div className="alert alert-danger">{error}</div>}
        </Col>
      </Row>

      <Row>
        <Col>
          <AppList apps={data.apps} isLoading={isInitialLoading} showEmptyMessage="No apps available at the moment." />

          {!isInitialLoading && !error && data.apps.length > 0 && (
            <Pagination
              currentPage={data.pagination.currentPage}
              totalPages={data.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </Col>
      </Row>
    </Container>
  )
}
