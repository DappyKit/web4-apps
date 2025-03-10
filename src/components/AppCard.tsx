import React from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { App } from '../services/api'
import { formatDate } from '../utils/dateUtils'

interface AppCardProps {
  app: App
  onDelete?: () => void
  isDeleting?: boolean
  showDelete?: boolean
}

/**
 * Renders a modern card displaying app information with hover effects and responsive design
 * @param {AppCardProps} props - Component props containing app data
 * @returns {JSX.Element} App card component
 */
const AppCard: React.FC<AppCardProps> = ({ app, onDelete, isDeleting, showDelete }) => {
  return (
    <Card className="h-100 template-card border border-light shadow-sm">
      <Card.Body className="d-flex flex-column">
        <div className="template-card-header mb-3">
          <Card.Title className="h5 text-primary mb-2">{app.name}</Card.Title>
          {app.description && <Card.Text className="text-muted small text-truncate">{app.description}</Card.Text>}
        </div>
        <div className="template-card-meta small text-muted mt-auto">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span>Created: {formatDate(app.created_at)}</span>
          </div>
        </div>
        <div className="template-card-actions mt-3 d-flex gap-2">
          <Link to={`/apps/${String(app.id)}`} className="btn btn-outline-primary btn-sm flex-grow-1 hover-lift">
            View App
          </Link>
          {showDelete && (
            <button onClick={onDelete} disabled={isDeleting} className="btn btn-outline-danger btn-sm hover-lift">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}

export default AppCard
