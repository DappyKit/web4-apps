import React from 'react'
import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { Template } from '../services/api'

interface TemplateCardProps {
  template: Template
}

/**
 * Renders a card displaying template information with actions
 * @param {TemplateCardProps} props - Component props
 * @returns {JSX.Element} Template card component
 */
const TemplateCard: React.FC<TemplateCardProps> = ({ template }) => {
  return (
    <Card>
      <Card.Body>
        <Card.Title className="mb-2">{template.title}</Card.Title>
        {template.description && <Card.Text className="text-muted small">{template.description}</Card.Text>}
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3">
          <Link to={`/templates/${String(template.id)}`} className="btn btn-outline-primary btn-sm">
            View
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}

export default TemplateCard
