import React from 'react'
import { Card, Button, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { Template } from '../services/api'

interface TemplateCardProps {
  template: Template
  onDelete: () => void
  isDeleting: boolean
  showDelete?: boolean
}

/**
 * Renders a card displaying template information with actions
 * @param {TemplateCardProps} props - Component props
 * @returns {JSX.Element} Template card component
 */
const TemplateCard: React.FC<TemplateCardProps> = ({ template, onDelete, isDeleting, showDelete = true }) => {
  return (
    <Card>
      <Card.Body>
        <Card.Title className="mb-2">{template.title}</Card.Title>
        {template.description && <Card.Text className="text-muted small">{template.description}</Card.Text>}
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3">
          <Link to={`/templates/${String(template.id)}`} className="btn btn-outline-primary btn-sm">
            View
          </Link>
          {showDelete && (
            <Button variant="outline-danger" size="sm" onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  <span className="d-none d-sm-inline">Deleting...</span>
                  <span className="d-inline d-sm-none">...</span>
                </>
              ) : (
                'Delete'
              )}
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}

export default TemplateCard
