import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Alert, Button, Form, Spinner, Modal } from 'react-bootstrap'
import { createTemplate, getMyTemplates, deleteTemplate } from '../services/api'
import type { Template } from '../services/api'
import TemplateList from '../components/TemplateList'
import { Pagination } from '../components/Pagination'

// Constants
const ITEMS_PER_PAGE = 12
const MAX_TITLE_LENGTH = 255
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_JSON_LENGTH = 10000

interface FormData {
  title: string
  description: string
  url: string
  jsonData: string
}

type FormErrors = Record<keyof FormData, string | undefined>

export function MyTemplates(): React.JSX.Element {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    url: '',
    jsonData: '',
  })
  const [errors, setErrors] = useState<FormErrors>({
    title: undefined,
    description: undefined,
    url: undefined,
    jsonData: undefined,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadTemplates = useCallback(async () => {
    if (!address) return

    try {
      const myTemplates = await getMyTemplates(address)
      setTemplates(myTemplates)
      setTotalPages(Math.ceil(myTemplates.length / ITEMS_PER_PAGE))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load templates'
      setError(errorMessage)
      console.error('Error loading templates:', error)
    }
  }, [address])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const validateForm = useCallback(() => {
    const newErrors: FormErrors = {
      title: undefined,
      description: undefined,
      url: undefined,
      jsonData: undefined,
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be less than ${String(MAX_TITLE_LENGTH)} characters`
    }

    if (formData.description && formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${String(MAX_DESCRIPTION_LENGTH)} characters`
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else {
      try {
        new URL(formData.url)
      } catch {
        newErrors.url = 'Please enter a valid URL'
      }
    }

    if (!formData.jsonData.trim()) {
      newErrors.jsonData = 'JSON data is required'
    } else if (formData.jsonData.length > MAX_JSON_LENGTH) {
      newErrors.jsonData = `JSON data must be less than ${String(MAX_JSON_LENGTH)} characters`
    } else {
      try {
        JSON.parse(formData.jsonData)
      } catch {
        newErrors.jsonData = 'Please enter valid JSON data'
      }
    }

    setErrors(newErrors)
    return Object.values(newErrors).every(error => error === undefined)
  }, [formData])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSuccess(null)

      if (!validateForm()) {
        return
      }

      setIsCreating(true)

      try {
        const signature = await signMessageAsync({
          message: `Create template: ${formData.title.trim()}`,
        })

        await createTemplate(
          address as string,
          formData.title.trim(),
          formData.description.trim() || undefined,
          formData.url.trim(),
          formData.jsonData.trim(),
          signature,
        )

        setSuccess('Template created successfully!')
        setFormData({ title: '', description: '', url: '', jsonData: '' })
        await loadTemplates()
        setShowCreateModal(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to create template')
      } finally {
        setIsCreating(false)
      }
    },
    [address, formData, loadTemplates, signMessageAsync, validateForm],
  )

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      void handleSubmit(e)
    },
    [handleSubmit],
  )

  const handleDeleteTemplate = useCallback(
    async (templateId: number) => {
      if (!address || isDeleting !== null) return

      setIsDeleting(templateId)
      setError(null)

      try {
        const message = `Delete template #${String(templateId)}`
        const signature = await signMessageAsync({ message })

        await deleteTemplate(address, templateId, signature)
        await loadTemplates()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete template'
        setError(errorMessage)
        console.error('Error deleting template:', error)
      } finally {
        setIsDeleting(null)
      }
    },
    [address, isDeleting, loadTemplates, signMessageAsync],
  )

  const handleTemplateDelete = useCallback((templateId: number) => {
    setTemplateToDelete(templateId)
    setShowCreateModal(false)
    setShowDeleteModal(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!templateToDelete) return

    try {
      await handleDeleteTemplate(templateToDelete)
      setShowDeleteModal(false)
      setTemplateToDelete(null)
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }, [handleDeleteTemplate, templateToDelete])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData(prev => ({ ...prev, [name]: value }))
      // Clear error when user starts typing
      if (errors[name as keyof FormErrors]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined,
        }))
      }
    },
    [errors],
  )

  // Get current page items
  const getCurrentPageItems = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return templates.slice(startIndex, endIndex)
  }, [currentPage, templates])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">My Templates</h1>
        <Button
          variant="primary"
          onClick={() => {
            setShowCreateModal(true)
          }}
          className="btn-sm d-flex align-items-center gap-2"
        >
          <i className="bi bi-plus-circle d-flex align-items-center"></i>
          New Template
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="mt-4">
        <TemplateList
          templates={getCurrentPageItems()}
          onDeleteTemplate={handleTemplateDelete}
          isDeleting={isDeleting}
          showEmptyMessage="Click the 'New Template' button to create your first template"
        />

        {templates.length > ITEMS_PER_PAGE && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false)
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                isInvalid={!!errors.title}
              />
              {errors.title && <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={formData.description}
                onChange={handleChange}
                isInvalid={!!errors.description}
              />
              {errors.description && <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>URL</Form.Label>
              <Form.Control
                type="text"
                name="url"
                value={formData.url}
                onChange={handleChange}
                isInvalid={!!errors.url}
              />
              {errors.url && <Form.Control.Feedback type="invalid">{errors.url}</Form.Control.Feedback>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>JSON Data</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="jsonData"
                value={formData.jsonData}
                onChange={handleChange}
                isInvalid={!!errors.jsonData}
                style={{ fontFamily: 'monospace' }}
              />
              {errors.jsonData && <Form.Control.Feedback type="invalid">{errors.jsonData}</Form.Control.Feedback>}
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create Template'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false)
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this template?</p>
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Warning: Some apps might be using this template. Deleting it will not affect existing apps, but they may
            lose access to the template&apos;s source.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void handleConfirmDelete()
            }}
            disabled={isDeleting !== null}
          >
            {isDeleting !== null ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete Template'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
