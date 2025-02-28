import { Spinner, Alert, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { App } from '../services/api'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'

const TITLE_MAX_LENGTH = 50
const DESCRIPTION_MAX_LENGTH = 100

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

interface AppListProps {
  apps: App[]
  isLoading: boolean
  onDeleteApp?: (appId: number) => Promise<void>
  isDeleting?: number | null
  showEmptyMessage?: string
}

export function AppList({
  apps,
  isLoading,
  onDeleteApp,
  isDeleting,
  showEmptyMessage = 'No apps available.',
}: AppListProps): React.JSX.Element {
  const renderAppCard = (app: App): React.JSX.Element => (
    <div key={app.id} className="col">
      <div className="card h-100">
        <div className="card-body">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id={`title-tooltip-${String(app.id)}`}>{app.name}</Tooltip>}
          >
            <h5 className="card-title text-truncate">{truncateText(app.name, TITLE_MAX_LENGTH)}</h5>
          </OverlayTrigger>

          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`description-tooltip-${String(app.id)}`}>{app.description ?? 'No description'}</Tooltip>
            }
          >
            <p className="card-text">{truncateText(app.description ?? 'No description', DESCRIPTION_MAX_LENGTH)}</p>
          </OverlayTrigger>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <Link to={`/apps/${String(app.id)}`} className="btn btn-outline-primary btn-sm">
              View
            </Link>

            {onDeleteApp && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => {
                  void onDeleteApp(Number(app.id))
                }}
                disabled={isDeleting === Number(app.id)}
              >
                {isDeleting === Number(app.id) ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Show spinner only on initial load when there are no apps yet
  if (isLoading && apps.length === 0) {
    return (
      <div
        className="text-center"
        style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  }

  // Show empty message only when not loading and no apps
  if (!isLoading && apps.length === 0) {
    return (
      <div style={{ minHeight: '200px' }}>
        <Alert variant="info">{showEmptyMessage}</Alert>
      </div>
    )
  }

  // Main content - simple and direct rendering
  return (
    <div className="w-100">
      <div className="mx-0 row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3 g-md-4">{apps.map(renderAppCard)}</div>
    </div>
  )
}
