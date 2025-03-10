import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Alert, Button } from 'react-bootstrap'
import { createTemplate, getMyTemplates, deleteTemplate } from '../services/api'
import type { Template } from '../services/api'
import TemplateList from '../components/TemplateList'
import { Pagination } from '../components/Pagination'
import { CreateTemplateModal } from '../components/CreateTemplateModal'
import { DeleteTemplateModal } from '../components/DeleteTemplateModal'

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

  const handleHideCreateModal = useCallback(() => {
    setShowCreateModal(false)
  }, [])

  const handleHideDeleteModal = useCallback(() => {
    setShowDeleteModal(false)
  }, [])

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div className="flex-grow-1 text-center">
          <h1 className="h2 mb-0">My Templates</h1>
        </div>
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

      {/* Use the new modal components */}
      <CreateTemplateModal
        show={showCreateModal}
        onHide={handleHideCreateModal}
        formData={formData}
        errors={errors}
        isCreating={isCreating}
        onChange={handleChange}
        onSubmit={e => {
          void handleSubmit(e)
        }}
      />

      <DeleteTemplateModal
        show={showDeleteModal}
        onHide={handleHideDeleteModal}
        isDeleting={isDeleting !== null}
        onConfirmDelete={() => {
          void handleConfirmDelete()
        }}
      />
    </div>
  )
}
