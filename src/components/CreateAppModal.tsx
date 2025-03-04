import { useState, useEffect } from 'react'
import { Alert, Button, Form, Spinner, Modal } from 'react-bootstrap'
import { useSignMessage } from 'wagmi'
import { createApp } from '../services/api'
import type { Template } from '../services/api'

// Constants matching backend limitations
const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_JSON_DATA_LENGTH = 10000

interface FormData {
  name: string
  description: string
  templateId: string
  jsonData: string
}

interface FormErrors {
  [key: string]: string | undefined
  name?: string
  description?: string
  templateId?: string
  jsonData?: string
}

interface CreateAppModalProps {
  show: boolean
  onHide: () => void
  onSuccess: () => Promise<void>
  address: string | undefined
  showTemplateModal: () => void
  selectedTemplate: Template | null
}

/**
 * Modal component for creating a new app
 * @param props Component properties
 * @returns React component
 */
export function CreateAppModal({
  show,
  onHide,
  onSuccess,
  address,
  showTemplateModal,
  selectedTemplate,
}: CreateAppModalProps): React.JSX.Element {
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

  // Update form when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        templateId: String(selectedTemplate.id),
        jsonData: selectedTemplate.json_data,
      }))
    }
  }, [selectedTemplate])

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

    if (!validateForm() || !address) {
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
        address,
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
      await onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create app'

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

  // Character counts
  const nameCharCount = formData.name.trim().length
  const descriptionCharCount = formData.description.trim().length
  const jsonDataCharCount = formData.jsonData.trim().length

  const handleClose = (): void => {
    onHide()
    setError(null)
    setSuccess(null)
    setFormData({
      name: '',
      description: '',
      templateId: '',
      jsonData: '{}',
    })
    setErrors({})
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
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
              <Button variant="outline-secondary" onClick={showTemplateModal} disabled={isCreating}>
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
            <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
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
  )
}
