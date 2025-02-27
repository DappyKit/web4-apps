import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Alert, Spinner, Card } from 'react-bootstrap'
import { getTemplateById } from '../services/api'
import type { Template } from '../services/api'

/**
 * Component for viewing detailed information about a specific template
 * @returns {React.JSX.Element} The template details view
 */
export function ViewTemplate(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplate = async (): Promise<void> => {
      if (!id) return

      try {
        const templateData = await getTemplateById(Number(id))
        setTemplate(templateData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load template details'
        setError(errorMessage)
        console.error('Error loading template:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadTemplate()
  }, [id])

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3">
        <Alert variant="danger">{error}</Alert>
        <Link 
          to="/my-templates" 
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-3">
        <Alert variant="warning">Template not found</Alert>
        <Link 
          to="/my-templates" 
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-3">
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link 
          to="/my-templates" 
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
        <h1 className="h2 mb-0">{template.title}</h1>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Template Details</Card.Title>
          <dl className="row mb-0">
            <dt className="col-sm-3">ID</dt>
            <dd className="col-sm-9">{template.id}</dd>

            <dt className="col-sm-3">Description</dt>
            <dd className="col-sm-9">{template.description ?? 'No description provided'}</dd>

            <dt className="col-sm-3">Owner</dt>
            <dd className="col-sm-9">
              <code>{template.owner_address}</code>
            </dd>

            <dt className="col-sm-3">URL</dt>
            <dd className="col-sm-9">
              <a href={template.url} target="_blank" rel="noopener noreferrer">
                {template.url}
              </a>
            </dd>

            <dt className="col-sm-3">Created</dt>
            <dd className="col-sm-9">{new Date(template.created_at).toLocaleString()}</dd>

            <dt className="col-sm-3">Last Updated</dt>
            <dd className="col-sm-9">{new Date(template.updated_at).toLocaleString()}</dd>
          </dl>
        </Card.Body>
      </Card>

      {template.json_data && (
        <Card>
          <Card.Body>
            <Card.Title>Template Configuration</Card.Title>
            <pre className="mb-0">
              <code>{JSON.stringify(JSON.parse(template.json_data), null, 2)}</code>
            </pre>
          </Card.Body>
        </Card>
      )}
    </div>
  )
} 