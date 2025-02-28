import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Alert, Button, Form, Spinner, Modal, Table } from 'react-bootstrap'
import { createApp, getMyApps, deleteApp, getMyTemplates } from '../services/api'
import type { App, Template } from '../services/api'
import { AppList } from '../components/AppList'
import { Pagination } from '../components/Pagination'

// Constants matching backend limitations
const ITEMS_PER_PAGE = 12
const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_JSON_DATA_LENGTH = 10000 // Adjust based on your backend limits

interface FormData {
  name: string
  description: string
  templateId: string // Using string for form input, will convert to number
  jsonData: string
}

interface FormErrors {
  [key: string]: string | undefined
  name?: string
  description?: string
  templateId?: string
  jsonData?: string
}

export function MyApps(): React.JSX.Element {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    templateId: '',
    jsonData: '{}',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadApps = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    try {
      const myApps = await getMyApps(address)
      setApps(myApps)
      setTotalPages(Math.ceil(myApps.length / ITEMS_PER_PAGE))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load apps'
      setError(errorMessage)
      console.error('Error loading apps:', error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const loadTemplates = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    try {
      const templates = await getMyTemplates(address)
      setTemplates(templates)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load templates'
      setError(errorMessage)
      console.error('Error loading templates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    loadApps().catch(console.error)
    loadTemplates().catch(console.error)
  }, [loadApps, loadTemplates])

  /**
   * Validates the form data
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    const trimmedName = formData.name.trim()
    const trimmedDescription = formData.description.trim()
    const templateId = formData.templateId.trim()
    const jsonData = formData.jsonData.trim()

    // Validate name
    if (!trimmedName) {
      newErrors.name = 'App name is required'
    } else if (trimmedName.length < 3) {
      newErrors.name = 'App name must be at least 3 characters'
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      newErrors.name = `App name must be less than ${String(MAX_NAME_LENGTH)} characters`
    }

    // Validate description
    if (trimmedDescription && trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${String(MAX_DESCRIPTION_LENGTH)} characters`
    }

    // Validate templateId
    if (!templateId) {
      newErrors.templateId = 'Template ID is required'
    } else if (!/^\d+$/.test(templateId)) {
      newErrors.templateId = 'Template ID must be a number'
    }

    // Validate jsonData
    if (!jsonData) {
      newErrors.jsonData = 'JSON data is required'
    } else {
      try {
        JSON.parse(jsonData)
        if (jsonData.length > MAX_JSON_DATA_LENGTH) {
          newErrors.jsonData = `JSON data must be less than ${String(MAX_JSON_DATA_LENGTH)} characters`
        }
      } catch {
        newErrors.jsonData = 'Invalid JSON format'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!validateForm()) {
      return
    }

    setIsCreating(true)

    try {
      const templateId = Number(formData.templateId.trim())
      const message = `Create app: ${formData.name.trim()}`

      const signature = await signMessageAsync({
        message,
      })

      await createApp(
        address as string,
        formData.name.trim(),
        formData.description.trim() || undefined,
        signature,
        templateId,
        formData.jsonData.trim(),
      )

      setSuccess('App created successfully!')
      setFormData({
        name: '',
        description: '',
        templateId: '',
        jsonData: '{}',
      })
      await loadApps()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create app'

      // Only check for invalid signature, pass through all other errors directly
      if (errorMessage.includes('Invalid signature')) {
        setError('Authentication error: Invalid signature. Please try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: _, ...rest } = prev
        return rest
      })
    }
  }

  const formatJsonData = (): void => {
    try {
      const formatted = JSON.stringify(JSON.parse(formData.jsonData), null, 2)
      setFormData(prev => ({ ...prev, jsonData: formatted }))

      // Clear error if JSON is now valid
      if (errors.jsonData) {
        setErrors(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { jsonData: _, ...rest } = prev
          return rest
        })
      }
    } catch {
      // JSON parsing failed
      setErrors(prev => ({
        ...prev,
        jsonData: 'Invalid JSON format',
      }))
    }
  }

  const handleDeleteApp = async (appId: number): Promise<void> => {
    if (!address || isDeleting !== null) return

    setIsDeleting(appId)
    setError(null)

    try {
      const message = `Delete application #${String(appId)}`
      const signature = await signMessageAsync({ message })

      await deleteApp(address, appId, signature)
      await loadApps()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete app'
      setError(errorMessage)
      console.error('Error deleting app:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  // Add character count display
  const nameCharCount = formData.name.trim().length
  const descriptionCharCount = formData.description.trim().length
  const jsonDataCharCount = formData.jsonData.trim().length

  // Get current page items
  const getCurrentPageItems = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return apps.slice(startIndex, endIndex)
  }, [currentPage, apps])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">My Apps</h1>
        <Button
          variant="primary"
          onClick={() => {
            setShowCreateModal(true)
          }}
          className="btn-sm d-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-circle d-flex align-items-center"></i>
          New App
        </Button>
      </div>

      <div className="mt-4">
        <AppList
          apps={getCurrentPageItems()}
          isLoading={isLoading}
          onDeleteApp={handleDeleteApp}
          isDeleting={isDeleting}
          showEmptyMessage="You don't have any apps yet. Click the 'New App' button to create one!"
        />

        {apps.length > ITEMS_PER_PAGE && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      {/* Create App Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false)
          setError(null)
          setSuccess(null)
          setFormData({
            name: '',
            description: '',
            templateId: '',
            jsonData: '{}',
          })
          setErrors({})
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New App</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert
              variant="danger"
              onClose={() => {
                setError(null)
              }}
              dismissible
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              variant="success"
              onClose={() => {
                setSuccess(null)
              }}
              dismissible
            >
              {success}
            </Alert>
          )}

          <Form
            onSubmit={e => {
              void handleSubmit(e)
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label htmlFor="name">
                App Name
                <span className="text-muted ms-2">
                  ({nameCharCount}/{MAX_NAME_LENGTH})
                </span>
              </Form.Label>
              <Form.Control
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                isInvalid={!!errors.name}
                disabled={isCreating}
                maxLength={MAX_NAME_LENGTH}
              />
              <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="description">
                Description
                <span className="text-muted ms-2">
                  ({descriptionCharCount}/{MAX_DESCRIPTION_LENGTH})
                </span>
              </Form.Label>
              <Form.Control
                as="textarea"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                disabled={isCreating}
                isInvalid={!!errors.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="templateId">Template ID</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="text"
                  id="templateId"
                  name="templateId"
                  value={formData.templateId}
                  onChange={handleChange}
                  isInvalid={!!errors.templateId}
                  disabled={isCreating}
                  placeholder="Enter template ID"
                  className="me-2"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setShowTemplateModal(true)
                  }}
                  disabled={isCreating}
                >
                  Browse
                </Button>
              </div>
              <Form.Control.Feedback type="invalid">{errors.templateId}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="jsonData">
                JSON Data
                <span className="text-muted ms-2">
                  ({jsonDataCharCount}/{MAX_JSON_DATA_LENGTH})
                </span>
              </Form.Label>
              <Form.Control
                as="textarea"
                id="jsonData"
                name="jsonData"
                value={formData.jsonData}
                onChange={handleChange}
                rows={4}
                disabled={isCreating}
                isInvalid={!!errors.jsonData}
                maxLength={MAX_JSON_DATA_LENGTH}
                style={{ fontFamily: 'monospace' }}
              />
              <Form.Control.Feedback type="invalid">{errors.jsonData}</Form.Control.Feedback>
              <div className="d-flex justify-content-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={formatJsonData}
                  disabled={isCreating}
                  className="mt-1"
                >
                  Format JSON
                </Button>
              </div>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create App'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Template Selection Modal */}
      <Modal
        show={showTemplateModal}
        onHide={() => {
          setShowTemplateModal(false)
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Select a Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {templates.length === 0 ? (
            <p className="text-center">No templates available. Please create a template first.</p>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <tr key={template.id}>
                    <td>{template.id}</td>
                    <td>{template.title}</td>
                    <td>{template.description ?? '-'}</td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            templateId: String(template.id),
                            jsonData: template.json_data,
                          }))
                          setShowTemplateModal(false)
                        }}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowTemplateModal(false)
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
