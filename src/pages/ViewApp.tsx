import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Alert, Spinner, Card } from 'react-bootstrap'
import { getAppById } from '../services/api'
import type { App } from '../services/api'

/**
 * Component for viewing detailed information about a specific app
 * @returns {React.JSX.Element} The app details view
 */
export function ViewApp(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [app, setApp] = useState<App | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadApp = async (): Promise<void> => {
      if (!id) return

      try {
        const appData = await getAppById(Number(id))
        setApp(appData)
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

            <dt className="col-sm-3">Template ID</dt>
            <dd className="col-sm-9">{app.template_id}</dd>

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
            <pre className="mb-0">
              <code>{JSON.stringify(JSON.parse(app.json_data), null, 2)}</code>
            </pre>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
