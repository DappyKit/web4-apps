/* eslint-disable @typescript-eslint/no-floating-promises */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getTemplateById, deleteTemplate } from '../services/api'
import type { Template } from '../services/api'
import { Alert, Spinner, Card, Button } from 'react-bootstrap'
import { useAccount, useSignMessage } from 'wagmi'
import { handlePromiseSafely } from '../utils/promiseUtils'

/**
 * Component for viewing detailed information about a specific template
 * @returns {React.JSX.Element} The template details view
 */
export function ViewTemplate(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [template, setTemplate] = useState<Template | null>(null)
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
        const data = await getTemplateById(Number(currentId))

        if (signal.aborted) return

        setTemplate(data)
      } catch (error: unknown) {
        if (signal.aborted) return

        const errorMessage = error instanceof Error ? error.message : 'Failed to load template details'
        setError(errorMessage)
        console.error('Error loading template:', error)
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

  const handleDeleteTemplate = async (): Promise<void> => {
    if (!id || !template || !address) return

    setIsDeleting(true)

    try {
      // Create a signature for deleting the template
      const message = `Delete template #${String(id)}`
      const signature = await signMessageAsync({ message })

      await deleteTemplate(address, Number(id), signature)
      navigate('/my-templates')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete template'
      alert(`Error: ${errorMessage}`)
      console.error('Error deleting template:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Delete confirmation handler
  const confirmDelete = (): void => {
    const confirmed = window.confirm('Are you sure you want to delete this template?')
    if (confirmed) {
      handlePromiseSafely(handleDeleteTemplate())
    }
  }

  const isOwner = template && address ? template.owner_address.toLowerCase() === address.toLowerCase() : false

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
        <p className="mt-3">Loading template details...</p>
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

  if (!template) {
    return (
      <Alert variant="warning" className="m-4">
        Template not found.
      </Alert>
    )
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center mb-4">
        <Link
          to="/my-templates"
          className="btn btn-outline-primary rounded-circle d-flex align-items-center justify-content-center me-3"
          style={{ width: '42px', height: '42px' }}
        >
          <i className="bi bi-arrow-left" style={{ lineHeight: 0 }}></i>
        </Link>
        <h2 className="m-0">{template.title}</h2>
        {isOwner && (
          <div className="ms-auto">
            <Button variant="outline-danger" size="sm" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </Button>
          </div>
        )}
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Template Details</Card.Title>
          <div className="mb-3">
            <strong>Description:</strong> {template.description ?? 'No description'}
          </div>
          <div className="mb-3">
            <strong>Created:</strong> {new Date(template.created_at).toLocaleDateString()}
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Card.Title>Template JSON Schema</Card.Title>
          <pre className="bg-light p-3 rounded">
            <code>{JSON.stringify(JSON.parse(template.json_data), null, 2)}</code>
          </pre>
        </Card.Body>
      </Card>
    </div>
  )
}
