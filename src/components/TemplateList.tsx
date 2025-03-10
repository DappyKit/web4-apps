import React, { JSX } from 'react'
import { Row, Col } from 'react-bootstrap'
import { Template } from '../services/api'
import TemplateCard from './TemplateCard'

interface TemplateListProps {
  templates: Template[]
  showEmptyMessage?: string
  onDeleteTemplate?: (templateId: number) => void
  isDeleting?: number | null
  showDelete?: boolean
}

/**
 * Renders a grid of template cards
 * @param {TemplateListProps} props - Component props
 * @returns {JSX.Element} Template list component
 */
const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  showEmptyMessage = 'No templates found',
  // These props are for future implementation of delete functionality
  onDeleteTemplate,
  isDeleting,
  showDelete = false,
}: TemplateListProps): JSX.Element => {
  // This is just to make TypeScript not complain about unused variables
  // Will be implemented in the future
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  /* eslint-disable no-constant-condition */
  if (false) {
    console.log(onDeleteTemplate, isDeleting, showDelete)
  }
  /* eslint-enable no-constant-condition */
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  if (templates.length === 0) {
    return <div className="text-center mt-4">{showEmptyMessage}</div>
  }

  return (
    <Row xs={1} sm={2} lg={3} className="g-3 g-md-4">
      {templates.map(template => (
        <Col key={template.id}>
          <TemplateCard template={template} />
        </Col>
      ))}
    </Row>
  )
}

export default TemplateList
