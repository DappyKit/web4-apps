/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-floating-promises */
import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Alert, Spinner, Card, Button } from 'react-bootstrap'
import { getAppById, getTemplateById, deleteApp } from '../services/api'
import type { App, Template } from '../services/api'
import { ReadOnlyForm } from '../components/ReadOnlyForm'
import { parseTemplateSchema } from '../utils/schemaParser'
import type { FormField } from '../utils/schemaParser'
import { useAccount, useSignMessage } from 'wagmi'
import { handlePromiseSafely } from '../utils/promiseUtils'

/**
 * Component for viewing detailed information about a specific app
 * @returns {React.JSX.Element} The app details view
 */
export function ViewApp(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [app, setApp] = useState<App | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [formSchema, setFormSchema] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const navigate = useNavigate()

  useEffect(() => {
    const abortController = new AbortController()
    const { signal } = abortController

    // To prevent the TypeScript error about id potentially being null
    const currentId = id
    if (!currentId) return

    setIsLoading(true)

    const fetchData = async (): Promise<void> => {
      try {
        const appData = await getAppById(Number(currentId))

        if (signal.aborted) return

        setApp(appData)

        // Load the template to get the schema
        const templateId = appData.template_id
        if (templateId === undefined || templateId === null) return

        try {
          const templateData = await getTemplateById(templateId)

          if (signal.aborted) return

          setTemplate(templateData)

          // Parse the template schema
          const schema = parseTemplateSchema(templateData.json_data)
          setFormSchema(schema)

          // Parse the app's JSON data if available
          const jsonData = appData.json_data
          if (jsonData === undefined || jsonData === null) return

          try {
            const parsedData = JSON.parse(jsonData) as Record<string, unknown>

            if (signal.aborted) return

            setFormData(parsedData)
          } catch (error: unknown) {
            console.error('Error parsing app JSON data:', error)
          }
        } catch (error: unknown) {
          console.error('Error loading template:', error)
          // We still want to show the app even if we can't load its template
        }
      } catch (error: unknown) {
        if (signal.aborted) return

        const errorMessage = error instanceof Error ? error.message : 'Failed to load app details'
        setError(errorMessage)
        console.error('Error loading app:', error)
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    // Execute the fetch and handle the promise safely
    handlePromiseSafely(fetchData(), error => {
      console.error('Error in fetchData:', error)
    })

    // Cleanup function
    return () => {
      abortController.abort()
    }
  }, [id])

  const handleDeleteApp = async (): Promise<void> => {
    if (!id || !app || !address) return

    setIsDeleting(true)

    try {
      // Create a signature for deleting the app
      const message = `Delete application #${String(id)}`
      const signature = await signMessageAsync({ message })

      await deleteApp(address, Number(id), signature)
      navigate('/my-apps')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete app'
      alert(`Error: ${errorMessage}`)
      console.error('Error deleting app:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Delete confirmation handler
  const confirmDelete = (): void => {
    const confirmed = window.confirm('Are you sure you want to delete this app?')
    if (confirmed) {
      handlePromiseSafely(handleDeleteApp())
    }
  }

  const isOwner = app && address ? app.owner_address.toLowerCase() === address.toLowerCase() : false

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading app details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-4">
        {error}
      </Alert>
    )
  }

  if (!app) {
    return (
      <Alert variant="warning" className="m-4">
        App not found.
      </Alert>
    )
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center mb-4">
        <Link
          to="/my-apps"
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center me-3"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
        <h2 className="m-0">{app.name}</h2>
        {isOwner && (
          <div className="ms-auto">
            <Button
              variant="outline-danger"
              size="sm"
              className="ms-auto"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete App'}
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>App Details</Card.Title>
          <div className="mb-3">
            <strong>Description:</strong> {app.description ?? 'No description'}
          </div>
          <div className="mb-3">
            <strong>Created:</strong> {new Date(app.created_at).toLocaleDateString()}
          </div>
          {template && (
            <div className="mb-3">
              <strong>Based on Template:</strong> <Link to={`/templates/${String(template.id)}`}>{template.title}</Link>
            </div>
          )}
        </Card.Body>
      </Card>

      {template && formSchema.length > 0 && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>App Data</Card.Title>
            <ReadOnlyForm schema={formSchema} data={formData} />
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
