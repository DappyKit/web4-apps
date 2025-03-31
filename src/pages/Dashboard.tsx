import { useState, useEffect, useCallback, JSX } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Alert } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import {
  checkUserRegistration,
  registerUser,
  getMyApps,
  deleteApp,
  getMyTemplates,
  deleteTemplate,
} from '../services/api'
import type { App, Template } from '../services/api'
import { AppList } from '../components/AppList'
import TemplateList from '../components/TemplateList'
import { DeleteTemplateModal } from '../components/DeleteTemplateModal'

const REGISTRATION_MESSAGE = 'Web4 Apps Registration'
const ITEMS_PER_SECTION = 9

export function Dashboard(): JSX.Element {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingApp, setIsDeletingApp] = useState<number | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState<number | null>(null)
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null)

  const checkRegistrationStatus = useCallback(async (): Promise<void> => {
    if (!address) return

    try {
      const registered = await checkUserRegistration(address)
      setIsRegistered(registered)
    } catch (error) {
      console.error('Error checking registration:', error)
      setError('Failed to check registration status')
    }
  }, [address])

  const loadData = useCallback(async (): Promise<void> => {
    if (!isRegistered || !address) return

    setIsLoading(true)
    try {
      const [appsData, templatesData] = await Promise.all([getMyApps(address), getMyTemplates(address)])
      setApps(appsData)
      setTemplates(templatesData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      setError(errorMessage)
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isRegistered, address])

  useEffect(() => {
    if (address) {
      void checkRegistrationStatus()
    }
  }, [address, checkRegistrationStatus])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRegister = async (): Promise<void> => {
    if (!address || isRegistering) return

    setIsRegistering(true)
    setError(null)

    try {
      const signature = await signMessageAsync({ message: REGISTRATION_MESSAGE })

      await registerUser(address, REGISTRATION_MESSAGE, signature)
      await checkRegistrationStatus()
      alert('Registration successful!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setError(errorMessage)
      alert(`Registration failed: ${errorMessage}`)
      console.error('Error during registration:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDeleteApp = async (appId: number): Promise<void> => {
    if (!address || isDeletingApp !== null) return

    setIsDeletingApp(appId)
    setError(null)

    try {
      const message = `Delete application #${String(appId)}`
      const signature = await signMessageAsync({ message })

      await deleteApp(address, appId, signature)
      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete app'
      setError(errorMessage)
      alert(`Failed to delete app: ${errorMessage}`)
      console.error('Error deleting app:', error)
    } finally {
      setIsDeletingApp(null)
    }
  }

  const handleDeleteTemplate = async (templateId: number): Promise<void> => {
    if (!address || isDeletingTemplate !== null) return

    setIsDeletingTemplate(templateId)
    setError(null)

    try {
      const message = `Delete template #${String(templateId)}`
      const signature = await signMessageAsync({ message })

      await deleteTemplate(address, templateId, signature)
      await loadData()
      setShowDeleteTemplateModal(false)
      setTemplateToDelete(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete template'
      setError(errorMessage)
      console.error('Error deleting template:', error)
    } finally {
      setIsDeletingTemplate(null)
    }
  }

  const handleTemplateDelete = (templateId: number): void => {
    setTemplateToDelete(templateId)
    setShowDeleteTemplateModal(true)
  }

  return (
    <div>
      <div className="d-flex justify-content-center flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="text-center">Dashboard</h1>
      </div>
      <p className="text-center text-muted mb-5">
        Welcome to your Web4 Apps dashboard. Manage your apps and templates in one place.
      </p>

      {isRegistered === false && (
        <div
          className="alert alert-primary shadow-sm border-0 rounded-4 p-4 position-relative overflow-hidden"
          role="alert"
        >
          <div className="row align-items-center">
            <div className="col-md-8">
              <h4 className="alert-heading mb-2">Ready to join Web4 World?</h4>
              <p className="mb-md-0">
                Register now to create apps, share templates, and join our
                developer community.
              </p>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <button
                className="btn btn-primary btn-lg px-4 fw-medium"
                onClick={() => {
                  void handleRegister()
                }}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Registering...
                  </>
                ) : (
                  'Register Now'
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          )}
          <div className="position-absolute top-0 end-0 mt-n4 me-n4 d-none d-md-block">
            <div className="text-primary opacity-10" style={{ fontSize: '150px' }}>
              <i className="bi bi-box-arrow-in-right"></i>
            </div>
          </div>
        </div>
      )}

      {isRegistered && (
        <>
          {/* Apps Section */}
          <div className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>My Apps</h2>
            </div>
            <div className="w-100" style={{ minWidth: 0 }}>
              <AppList
                apps={apps.slice(0, ITEMS_PER_SECTION)}
                isLoading={isLoading}
                onDeleteApp={handleDeleteApp}
                isDeleting={isDeletingApp}
                showEmptyMessage="You don't have any apps yet. Visit My Apps page to create one!"
              />
              {apps.length > ITEMS_PER_SECTION && (
                <div className="text-center mt-3">
                  <Link to="/my-apps" className="btn btn-outline-primary">
                    View All Apps
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Templates Section */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>My Templates</h2>
            </div>
            <div className="w-100" style={{ minWidth: 0 }}>
              <TemplateList
                templates={templates.slice(0, ITEMS_PER_SECTION)}
                onDeleteTemplate={handleTemplateDelete}
                isDeleting={isDeletingTemplate}
                showEmptyMessage="You don't have any templates yet. Visit My Templates page to create one!"
              />
              {templates.length > ITEMS_PER_SECTION && (
                <div className="text-center mt-3">
                  <Link to="/my-templates" className="btn btn-outline-primary">
                    View All Templates
                  </Link>
                </div>
              )}
            </div>
          </div>

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
        </>
      )}

      <DeleteTemplateModal
        show={showDeleteTemplateModal}
        onHide={() => {
          setShowDeleteTemplateModal(false)
          setTemplateToDelete(null)
        }}
        isDeleting={isDeletingTemplate !== null}
        onConfirmDelete={() => {
          if (templateToDelete) {
            void handleDeleteTemplate(templateToDelete)
          }
        }}
      />
    </div>
  )
}
