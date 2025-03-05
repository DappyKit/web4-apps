import { useState, useEffect } from 'react'
import { Alert, Button, Form, Spinner, Modal } from 'react-bootstrap'
import { useSignMessage } from 'wagmi'
import { createApp, getTemplateById } from '../services/api'
import type { Template } from '../services/api'
import { DynamicForm } from './DynamicForm'
import { parseTemplateSchema, formDataToJson } from '../utils/schemaParser'
import type { FormField } from '../utils/schemaParser'

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
  const [dynamicFormFields, setDynamicFormFields] = useState<FormField[] | null>(null)
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, unknown>>({})
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  // Update form when selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        templateId: String(selectedTemplate.id),
        jsonData: selectedTemplate.json_data,
      }))

      // Parse the template schema
      if (selectedTemplate.json_data) {
        try {
          const fields = parseTemplateSchema(selectedTemplate.json_data)
          setDynamicFormFields(fields)

          // Initialize form data from parsed schema
          const initialData = fields.reduce<Record<string, unknown>>((acc, field) => {
            if (field.defaultValue !== undefined) {
              acc[field.name] = field.defaultValue
            }
            return acc
          }, {})

          setDynamicFormData(initialData)
          // Set jsonData with the initial values
          setFormData(prev => ({
            ...prev,
            jsonData: formDataToJson(initialData),
          }))
        } catch (error) {
          console.error('Error parsing template schema:', error)
          setDynamicFormFields(null)
        }
      } else if (selectedTemplate.id) {
        void loadTemplateSchema(selectedTemplate.id)
      }
    }
  }, [selectedTemplate])

  /**
   * Loads the template schema from the server
   * @param templateId - The ID of the template to load
   */
  const loadTemplateSchema = async (templateId: number): Promise<void> => {
    if (!templateId) return

    setIsLoadingSchema(true)
    try {
      const template = await getTemplateById(templateId)
      if (template.json_data) {
        // Parse the template schema
        const fields = parseTemplateSchema(template.json_data)
        setDynamicFormFields(fields)

        // Initialize form data from parsed schema
        const initialData = fields.reduce<Record<string, unknown>>((acc, field) => {
          if (field.defaultValue !== undefined) {
            acc[field.name] = field.defaultValue
          }
          return acc
        }, {})

        setDynamicFormData(initialData)
        // Set jsonData with the initial values
        setFormData(prev => ({
          ...prev,
          jsonData: formDataToJson(initialData),
        }))
      }
    } catch (error) {
      console.error('Error loading template schema:', error)
    } finally {
      setIsLoadingSchema(false)
    }
  }

  /**
   * Validates the provided form data
   * @param dataToValidate Form data to validate
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateFormData = (dataToValidate: FormData): boolean => {
    const newErrors: FormErrors = {}
    const trimmedName = dataToValidate.name.trim()
    const trimmedDescription = dataToValidate.description.trim()
    const templateId = dataToValidate.templateId.trim()
    const jsonData = dataToValidate.jsonData.trim()

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

    // Update jsonData with current dynamicFormData
    let currentJsonData = formData.jsonData
    if (dynamicFormFields && dynamicFormFields.length > 0) {
      currentJsonData = formDataToJson(dynamicFormData)
      // Update form data for validation
      setFormData(prev => ({
        ...prev,
        jsonData: currentJsonData,
      }))
    }

    // Create a copy of form data with the updated jsonData for validation
    const updatedFormData = {
      ...formData,
      jsonData: currentJsonData,
    }

    // Validate with the updated form data
    if (!validateFormData(updatedFormData) || !address) {
      return
    }

    setIsCreating(true)

    try {
      const templateId = Number(updatedFormData.templateId.trim())
      const message = `Create app: ${updatedFormData.name.trim()}`

      const signature = await signMessageAsync({
        message,
      })

      await createApp(
        address,
        updatedFormData.name.trim(),
        updatedFormData.description.trim() || undefined,
        signature,
        templateId,
        currentJsonData.trim(),
      )

      setSuccess('App created successfully!')
      setFormData({
        name: '',
        description: '',
        templateId: '',
        jsonData: '{}',
      })
      setDynamicFormData({})
      setDynamicFormFields(null)
      await onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create app'

      if (errorMessage.includes('Invalid signature')) {
        setError('Authentication error: Invalid signature. Please try again.')
      } else if (errorMessage.includes('Invalid JSON data')) {
        // Extract the specific validation error
        const validationError = /Invalid JSON data: (.+)/.exec(errorMessage)?.[1] ?? 'Invalid JSON format'
        setErrors(prev => ({
          ...prev,
          jsonData: validationError,
        }))
        setError('Please fix the JSON data validation errors.')
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

  /**
   * Handles changes to the dynamic form data
   * @param data - The updated form data
   */
  const handleDynamicFormChange = (data: Record<string, unknown>): void => {
    setDynamicFormData(data)
    // Update jsonData field
    setFormData(prev => ({
      ...prev,
      jsonData: formDataToJson(data),
    }))

    // Clear any jsonData error
    if (errors.jsonData) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { jsonData: _, ...rest } = prev
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
    setDynamicFormData({})
    setDynamicFormFields(null)
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
              placeholder="Enter a descriptive name for your app"
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
              placeholder="Describe your app's purpose and functionality"
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
                disabled={true}
                placeholder="Select a template using the Browse button"
                className="me-2"
              />
              <Button variant="outline-secondary" onClick={showTemplateModal} disabled={isCreating}>
                Browse
              </Button>
            </div>
            <Form.Control.Feedback type="invalid">{errors.templateId}</Form.Control.Feedback>
          </Form.Group>

          {formData.templateId && (
            <div className="mb-3">
              <Form.Label>Template Data</Form.Label>
              {isLoadingSchema ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" role="status" className="me-2" />
                  Loading template schema...
                </div>
              ) : dynamicFormFields && dynamicFormFields.length > 0 ? (
                <div className="border rounded p-3">
                  <DynamicForm
                    schema={dynamicFormFields}
                    onChange={handleDynamicFormChange}
                    initialValues={dynamicFormData}
                    isDisabled={isCreating}
                  />
                </div>
              ) : (
                <Form.Group>
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
              )}

              {!!errors.jsonData && <div className="text-danger mt-2">{errors.jsonData}</div>}
            </div>
          )}

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
