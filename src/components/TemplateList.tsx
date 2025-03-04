import React, { JSX } from 'react'
import { Row, Col } from 'react-bootstrap'
import { Template } from '../services/api'
import TemplateCard from './TemplateCard'

interface TemplateListProps {
  templates: Template[]
  onDeleteTemplate: (id: number) => void
  isDeleting: number | null
  showDelete?: boolean
  showEmptyMessage?: string
}

/**
 * Renders a grid of template cards
 * @param {TemplateListProps} props - Component props
 * @returns {JSX.Element} Template list component
 */
const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onDeleteTemplate,
  isDeleting,
  showDelete = true,
  showEmptyMessage = 'No templates found',
}: TemplateListProps): JSX.Element => {
  if (templates.length === 0) {
    return <div className="text-center mt-4">{showEmptyMessage}</div>
  }

  return (
    <Row xs={1} sm={2} lg={3} className="g-3 g-md-4">
      {templates.map(template => (
        <Col key={template.id}>
          <TemplateCard
            template={template}
            onDelete={() => {
              onDeleteTemplate(template.id)
            }}
            isDeleting={isDeleting === template.id}
            showDelete={showDelete}
          />
        </Col>
      ))}
    </Row>
  )
}

export default TemplateList
