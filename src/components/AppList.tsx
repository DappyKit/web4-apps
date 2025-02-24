import { Spinner, Alert } from 'react-bootstrap';
import type { App } from '../services/api';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

interface AppListProps {
  apps: App[];
  isLoading: boolean;
  onDeleteApp?: (appId: number) => Promise<void>;
  isDeleting?: number | null;
  showEmptyMessage?: string;
}

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 150;

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export function AppList({ apps, isLoading, onDeleteApp, isDeleting, showEmptyMessage = "No apps available." }: AppListProps) {
  const renderAppCard = (app: App) => (
    <div key={app.id} className="col">
      <div className="card h-100">
        <div className="card-body">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id={`title-tooltip-${String(app.id)}`}>{app.name}</Tooltip>}
          >
            <h5 className="card-title text-truncate">
              {truncateText(app.name, TITLE_MAX_LENGTH)}
            </h5>
          </OverlayTrigger>

          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id={`description-tooltip-${String(app.id)}`}>{app.description ?? 'No description'}</Tooltip>}
          >
            <p className="card-text">
              {truncateText(app.description ?? 'No description', DESCRIPTION_MAX_LENGTH)}
            </p>
          </OverlayTrigger>

          {onDeleteApp && (
            <button
              className="btn btn-danger"
              onClick={() => { void onDeleteApp(Number(app.id)); }}
              disabled={isDeleting === Number(app.id)}
            >
              {isDeleting === Number(app.id) ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <Alert variant="info">
        {showEmptyMessage}
      </Alert>
    );
  }

  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      {apps.map(renderAppCard)}
    </div>
  );
} 