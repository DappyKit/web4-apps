import { useState, useEffect, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Alert, Button } from 'react-bootstrap'
import { getMyApps, deleteApp, getAllTemplatesForUser } from '../services/api'
import type { App, Template } from '../services/api'
import { AppList } from '../components/AppList'
import { Pagination } from '../components/Pagination'
import { CreateAppModal } from '../components/CreateAppModal'
import { TemplateSelectionModal } from '../components/TemplateSelectionModal'

// Constants matching backend limitations
const ITEMS_PER_PAGE = 12

export function MyApps(): React.JSX.Element {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadApps = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    try {
      const myApps = await getMyApps(address)
      setApps(myApps)
      setTotalPages(Math.ceil(myApps.length / ITEMS_PER_PAGE))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load apps'
      setError(errorMessage)
      console.error('Error loading apps:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const loadTemplates = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    try {
      // Get both user templates and public templates in a single request
      const combinedTemplates = await getAllTemplatesForUser(address)
      // Combine userTemplates and publicTemplates for the selection modal
      setTemplates([...combinedTemplates.userTemplates, ...combinedTemplates.publicTemplates])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates'
      setError(errorMessage)
      console.error('Error loading templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    void loadApps()
    void loadTemplates()
  }, [loadApps, loadTemplates])

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
        <div className="flex-grow-1 text-center">
          <h1 className="mb-0">My Apps</h1>
        </div>
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
      <p className="text-center text-muted">Create and manage your Web4 applications. Build something amazing today.</p>

      {error && (
        <Alert
          variant="danger"
          onClose={() => {
            setError(null)
          }}
          dismissible
          className="mb-4"
        >
          {error}
        </Alert>
      )}

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

      <CreateAppModal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false)
          setSelectedTemplate(null)
        }}
        onSuccess={async () => {
          await loadApps()
        }}
        address={address}
        showTemplateModal={() => {
          setShowTemplateModal(true)
        }}
        selectedTemplate={selectedTemplate}
      />

      <TemplateSelectionModal
        show={showTemplateModal}
        onHide={() => {
          setShowTemplateModal(false)
        }}
        templates={templates}
        onSelect={setSelectedTemplate}
      />
    </div>
  )
}
