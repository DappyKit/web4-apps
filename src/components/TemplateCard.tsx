import React from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { Template } from '../services/api'
import { formatDate } from '../utils/dateUtils'
import StatusIcon from './StatusIcon'

interface TemplateCardProps {
  template: Template
}

/**
 * Renders a modern card displaying template information with hover effects and responsive design
 * @param {TemplateCardProps} props - Component props containing template data
 * @returns {JSX.Element} Template card component
 */
const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  return (
    <Card className="h-100 template-card border border-light shadow-sm">
      <Card.Body className="d-flex flex-column">
        <div className="template-card-header mb-3">
          <Card.Title className="h5 text-primary mb-2">{template.title}</Card.Title>
          {template.description && (
            <Card.Text className="text-muted small text-truncate">{template.description}</Card.Text>
          )}
        </div>
        <div className="template-card-meta small text-muted mt-auto">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center">
              <StatusIcon type="created" value={formatDate(template.created_at)} id={String(template.id)} />
              <StatusIcon type={template.moderated ? 'moderated' : 'not-moderated'} id={String(template.id)} />
            </div>
          </div>
        </div>
        <div className="template-card-actions mt-3">
          <Link to={`/templates/${String(template.id)}`} className="btn btn-outline-primary btn-sm w-100 hover-lift">
            View Template
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}

export default TemplateCard
