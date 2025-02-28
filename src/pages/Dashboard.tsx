import { useState, useEffect, useCallback, JSX } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { checkUserRegistration, registerUser, getMyApps, deleteApp } from '../services/api'
import type { App } from '../services/api'
import { AppList } from '../components/AppList'

const REGISTRATION_MESSAGE = 'Web4 Apps Registration'

export function Dashboard(): JSX.Element {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

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

  const loadApps = useCallback(async (): Promise<void> => {
    if (!isRegistered || !address) return

    setIsLoading(true)
    try {
      setApps(await getMyApps(address))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load apps'
      setError(errorMessage)
      console.error('Error loading apps:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isRegistered, address])

  useEffect(() => {
    if (address) {
      checkRegistrationStatus().catch(console.error)
    }
  }, [address, checkRegistrationStatus])

  useEffect(() => {
    loadApps().catch(console.error)
  }, [loadApps])

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
    if (!address || isDeleting !== null) return

    setIsDeleting(appId)
    setError(null)

    try {
      const message = `Delete application #${String(appId)}`
      const signature = await signMessageAsync({ message })

      await deleteApp(address, appId, signature)
      await loadApps()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete app'
      setError(errorMessage)
      alert(`Failed to delete app: ${errorMessage}`)
      console.error('Error deleting app:', error)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Dashboard</h1>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Apps</h2>
      </div>

      {isRegistered === false && (
        <div className="alert alert-info" role="alert">
          <p>You need to register to use Web4 Apps.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              void handleRegister()
            }}
            disabled={isRegistering}
          >
            {isRegistering ? 'Registering...' : 'Register Now'}
          </button>
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
        </div>
      )}

      {isRegistered && (
        <>
          <div className="w-100" style={{ minWidth: 0 }}>
            <AppList
              apps={apps}
              isLoading={isLoading}
              onDeleteApp={handleDeleteApp}
              isDeleting={isDeleting}
              showEmptyMessage="You don't have any apps yet. Create one to get started!"
            />
          </div>

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  )
}
