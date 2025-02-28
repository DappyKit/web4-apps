import { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { getAllTemplates, type Template, type PaginatedTemplatesResponse } from '../services/api'
import TemplateList from '../components/TemplateList'
import { Pagination } from '../components/Pagination'
import { useSearchParams } from 'react-router-dom'

/**
 * No operation function
 */
const noop = (): void => {
  // Intentionally empty
  return undefined
}

export function AllTemplates(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get current page from URL or default to 1
  const initialPage = Number(searchParams.get('page') ?? 1)

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    templates: Template[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      limit: number
    }
  }>({
    templates: [],
    pagination: {
      currentPage: initialPage,
      totalPages: 1,
      totalItems: 0,
      limit: 12,
    },
  })

  // Fetch templates with pagination
  const fetchTemplates = useCallback(
    async (page: number): Promise<void> => {
      if (page === data.pagination.currentPage && data.templates.length > 0) {
        return // Prevent duplicate fetches for the same page
      }

      // Only show loading state on initial load
      if (data.templates.length === 0) {
        setIsInitialLoading(true)
      }
      setError(null)

      try {
        const response: PaginatedTemplatesResponse = await getAllTemplates(page, data.pagination.limit)

        setData({
          templates: response.data,
          pagination: {
            currentPage: response.pagination.page,
            totalPages: response.pagination.totalPages,
            totalItems: response.pagination.total,
            limit: response.pagination.limit,
          },
        })
      } catch (err) {
        console.error('Error fetching templates:', err)
        setError('Failed to load templates. Please try again later.')
      } finally {
        setIsInitialLoading(false)
      }
    },
    [data.pagination.currentPage, data.pagination.limit, data.templates.length],
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number): void => {
      if (page !== data.pagination.currentPage) {
        setSearchParams({ page: String(page) }, { replace: true })
        void fetchTemplates(page)
      }
    },
    [data.pagination.currentPage, fetchTemplates, setSearchParams],
  )

  // Initial fetch when component mounts or URL changes
  useEffect(() => {
    void fetchTemplates(initialPage)
  }, [initialPage, fetchTemplates])

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">All Templates</h1>
          <p className="text-center text-muted">Browse all moderated templates from our community</p>
          {error && <div className="alert alert-danger">{error}</div>}
        </Col>
      </Row>

      <Row>
        <Col>
          <TemplateList templates={data.templates} onDeleteTemplate={noop} isDeleting={false} showDelete={false} />

          {!isInitialLoading && !error && data.templates.length > 0 && (
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
