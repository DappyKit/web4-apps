import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Alert, Spinner, Card } from 'react-bootstrap'
import { getAppById, getTemplateById } from '../services/api'
import type { App, Template } from '../services/api'
import { ReadOnlyForm } from '../components/ReadOnlyForm'
import { parseTemplateSchema } from '../utils/schemaParser'
import type { FormField } from '../utils/schemaParser'

/**
 * Component for viewing detailed information about a specific app
 * @returns {React.JSX.Element} The app details view
 */
export function ViewApp(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [app, setApp] = useState<App | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [formSchema, setFormSchema] = useState<FormField[] | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadApp = async (): Promise<void> => {
      if (!id) return

      try {
        setIsLoading(true)
        const appData = await getAppById(Number(id))
        setApp(appData)

        // Load the template to get the schema
        if (appData.template_id) {
          try {
            const templateData = await getTemplateById(appData.template_id)
            setTemplate(templateData)

            // Parse the template schema
            const schema = parseTemplateSchema(templateData.json_data)
            setFormSchema(schema)

            // Parse the app's JSON data if available
            if (appData.json_data) {
              try {
                const parsedData = JSON.parse(appData.json_data) as Record<string, unknown>
                setFormData(parsedData)
              } catch (jsonError) {
                console.error('Error parsing app JSON data:', jsonError)
              }
            }
          } catch (templateError) {
            console.error('Error loading template:', templateError)
            // We still want to show the app even if we can't load its template
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load app details'
        setError(errorMessage)
        console.error('Error loading app:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadApp()
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
          to="/my-apps"
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="p-3">
        <Alert variant="warning">App not found</Alert>
        <Link
          to="/my-apps"
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
          to="/my-apps"
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
        <h1 className="h2 mb-0">{app.name}</h1>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>App Details</Card.Title>
          <dl className="row mb-0">
            <dt className="col-sm-3">ID</dt>
            <dd className="col-sm-9">{app.id}</dd>

            <dt className="col-sm-3">Description</dt>
            <dd className="col-sm-9">{app.description ?? 'No description provided'}</dd>

            <dt className="col-sm-3">Owner</dt>
            <dd className="col-sm-9">
              <code>{app.owner_address}</code>
            </dd>

            <dt className="col-sm-3">Template</dt>
            <dd className="col-sm-9">
              {template ? template.title : app.template_id ? `ID: ${String(app.template_id)}` : 'None'}
            </dd>

            <dt className="col-sm-3">Created</dt>
            <dd className="col-sm-9">{new Date(app.created_at).toLocaleString()}</dd>

            <dt className="col-sm-3">Last Updated</dt>
            <dd className="col-sm-9">{new Date(app.updated_at).toLocaleString()}</dd>
          </dl>
        </Card.Body>
      </Card>

      {app.json_data && (
        <Card>
          <Card.Body>
            <Card.Title>App Configuration</Card.Title>

            {formSchema ? (
              <ReadOnlyForm schema={formSchema} data={formData} />
            ) : (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Template schema could not be loaded. Showing raw JSON:
                <pre className="mt-3 mb-0">
                  <code>{JSON.stringify(JSON.parse(app.json_data), null, 2)}</code>
                </pre>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
