import { Button, Card, Spinner } from 'react-bootstrap'
import type { Template } from '../services/api'

interface TemplateListProps {
  templates: Template[]
  isLoading: boolean
  onDeleteTemplate: (id: number) => void
  isDeleting: number | null
  showEmptyMessage?: string
}

export function TemplateList({
  templates,
  isLoading,
  onDeleteTemplate,
  isDeleting,
  showEmptyMessage = 'No templates found',
}: TemplateListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  }

  if (!templates.length) {
    return <div className="text-center text-muted p-4">{showEmptyMessage}</div>
  }

  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      {templates.map(template => (
        <div key={template.id} className="col">
          <Card>
            <Card.Body>
              <Card.Title>{template.title}</Card.Title>
              {template.description && <Card.Text className="text-muted">{template.description}</Card.Text>}
              <div className="d-flex justify-content-between align-items-center">
                <a
                  href={template.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm"
                >
                  View Template
                </a>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => {
                    onDeleteTemplate(template.id)
                  }}
                  disabled={isDeleting === template.id}
                >
                  {isDeleting === template.id ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      ))}
    </div>
  )
}
