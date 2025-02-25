import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { createApp, getMyApps, deleteApp } from '../services/api'
import type { App } from '../services/api'
import { AppList } from '../components/AppList'

// Constants matching backend limitations
const MAX_NAME_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_JSON_DATA_LENGTH = 10000 // Adjust based on your backend limits

interface FormData {
  name: string;
  description: string;
  templateId: string; // Using string for form input, will convert to number
  jsonData: string;
}

interface FormErrors {
  [key: string]: string | undefined;
  name?: string;
  description?: string;
  templateId?: string;
  jsonData?: string;
}

export function MyApps(): React.JSX.Element {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    templateId: '',
    jsonData: '{}'
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  const loadApps = useCallback(async () => {
    if (!address) return
    
    setIsLoading(true)
    try {
      const myApps = await getMyApps(address)
      setApps(myApps)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load apps'
      setError(errorMessage)
      console.error('Error loading apps:', error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    loadApps().catch(console.error)
  }, [loadApps])

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
        message
      })

      await createApp(
        address as string,
        formData.name.trim(),
        formData.description.trim() || undefined,
        signature,
        templateId,
        formData.jsonData.trim()
      )

      setSuccess('App created successfully!')
      setFormData({ 
        name: '', 
        description: '', 
        templateId: '', 
        jsonData: '{}' 
      })
      await loadApps()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create app')
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
        jsonData: 'Invalid JSON format' 
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

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">My Apps</h1>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Create New App</h5>

              {error && (
                <Alert variant="danger" onClose={() => { setError(null) }} dismissible>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" onClose={() => { setSuccess(null) }} dismissible>
                  {success}
                </Alert>
              )}

              <Form onSubmit={(e) => { void handleSubmit(e) }}>
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
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Name must be between 3 and {MAX_NAME_LENGTH} characters
                  </Form.Text>
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
                  <Form.Control.Feedback type="invalid">
                    {errors.description}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Maximum {MAX_DESCRIPTION_LENGTH} characters
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="templateId">
                    Template ID
                  </Form.Label>
                  <Form.Control
                    type="text"
                    id="templateId"
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleChange}
                    isInvalid={!!errors.templateId}
                    disabled={isCreating}
                    placeholder="Enter template ID"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.templateId}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Enter the ID of the template you want to use
                  </Form.Text>
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
                    rows={8}
                    disabled={isCreating}
                    isInvalid={!!errors.jsonData}
                    maxLength={MAX_JSON_DATA_LENGTH}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.jsonData}
                  </Form.Control.Feedback>
                  <div className="d-flex justify-content-between">
                    <Form.Text className="text-muted">
                      Enter valid JSON data for your app
                    </Form.Text>
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

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Creating...
                    </>
                  ) : (
                    'Create App'
                  )}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h2>Your Apps</h2>
        <AppList
          apps={apps}
          isLoading={isLoading}
          onDeleteApp={handleDeleteApp}
          isDeleting={isDeleting}
          showEmptyMessage="You don't have any apps yet. Create one using the form above!"
        />
      </div>
    </div>
  )
}
