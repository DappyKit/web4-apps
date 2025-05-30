import { Pagination as BootstrapPagination } from 'react-bootstrap'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps): React.JSX.Element {
  // Generate page items based on current page and total pages
  const renderPageItems = (): React.JSX.Element[] => {
    const items: React.JSX.Element[] = []

    // For mobile screens, simplify pagination
    const isMobile = window.innerWidth < 576

    // Always show first page
    items.push(
      <BootstrapPagination.Item
        key={1}
        active={currentPage === 1}
        onClick={() => {
          onPageChange(1)
        }}
      >
        1
      </BootstrapPagination.Item>,
    )

    // Show ellipsis if needed after first page
    if (currentPage > 3 && (!isMobile || totalPages > 5)) {
      items.push(<BootstrapPagination.Ellipsis key="ellipsis-1" style={{ pointerEvents: 'none', cursor: 'default' }} />)
    }

    // Show pages around current page - fewer on mobile
    const range = isMobile ? 0 : 1
    for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
      if (i === 1 || i === totalPages) continue // Skip first and last page (they're always shown)

      items.push(
        <BootstrapPagination.Item
          key={i}
          active={currentPage === i}
          onClick={() => {
            onPageChange(i)
          }}
        >
          {i}
        </BootstrapPagination.Item>,
      )
    }

    // Show ellipsis if needed before last page
    if (currentPage < totalPages - 2 && (!isMobile || totalPages > 5)) {
      items.push(<BootstrapPagination.Ellipsis key="ellipsis-2" style={{ pointerEvents: 'none', cursor: 'default' }} />)
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <BootstrapPagination.Item
          key={totalPages}
          active={currentPage === totalPages}
          onClick={() => {
            onPageChange(totalPages)
          }}
        >
          {totalPages}
        </BootstrapPagination.Item>,
      )
    }

    return items
  }

  if (totalPages <= 1) {
    return <></>
  }

  return (
    <div className="d-flex justify-content-center my-4">
      <BootstrapPagination>
        <BootstrapPagination.Prev
          onClick={() => {
            onPageChange(Math.max(1, currentPage - 1))
          }}
          disabled={currentPage === 1}
        />

        {renderPageItems()}

        <BootstrapPagination.Next
          onClick={() => {
            onPageChange(Math.min(totalPages, currentPage + 1))
          }}
          disabled={currentPage === totalPages}
        />
      </BootstrapPagination>
    </div>
  )
}
