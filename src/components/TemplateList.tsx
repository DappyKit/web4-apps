import React from 'react'
import { Row, Col } from 'react-bootstrap'
import { Template } from '../services/api'
import TemplateCard from './TemplateCard'

interface TemplateListProps {
  templates: Template[]
  onDeleteTemplate: (id: number) => void
  isDeleting: boolean
}

/**
 * Renders a grid of template cards
 * @param {TemplateListProps} props - Component props
 * @returns {JSX.Element} Template list component
 */
const TemplateList: React.FC<TemplateListProps> = ({ templates, onDeleteTemplate, isDeleting }) => {
  if (templates.length === 0) {
    return <div className="text-center mt-4">No templates found</div>
  }

  return (
    <Row xs={1} md={2} lg={3} className="g-4">
      {templates.map((template) => (
        <Col key={template.id}>
          <TemplateCard 
            template={template}
            onDelete={() => {
              onDeleteTemplate(template.id)
            }}
            isDeleting={isDeleting}
          />
        </Col>
      ))}
    </Row>
  )
}

export default TemplateList
