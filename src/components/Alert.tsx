import React, { useEffect, useState, useCallback } from 'react'
import { Alert as BootstrapAlert } from 'react-bootstrap'
import './Alert.css'

interface AlertProps {
  type: 'error' | 'success' | 'info' | 'warning'
  message: string
  duration?: number
  onClose?: () => void
}

/**
 * Alert component for displaying messages with auto-dismiss functionality
 * @param props Component properties
 * @returns React component
 */
export function Alert({ type, message, duration = 5000, onClose }: AlertProps): React.JSX.Element | null {
  const [show, setShow] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = useCallback((): void => {
    setIsExiting(true)
    setTimeout(() => {
      setShow(false)
      if (onClose) {
        onClose()
      }
    }, 300) // Match this with CSS animation duration
  }, [onClose])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration)
      return () => {
        clearTimeout(timer)
      }
    }
    return undefined
  }, [duration, handleClose])

  if (!show) return null

  const variant = type === 'error' ? 'danger' : type

  return (
    <div className={`alert-wrapper ${isExiting ? 'alert-exit' : 'alert-enter'}`}>
      <BootstrapAlert variant={variant} onClose={handleClose} dismissible>
        <div className="d-flex align-items-center">
          {type === 'error' && <i className="bi bi-exclamation-triangle-fill me-2" />}
          {type === 'success' && <i className="bi bi-check-circle-fill me-2" />}
          {type === 'info' && <i className="bi bi-info-circle-fill me-2" />}
          {type === 'warning' && <i className="bi bi-exclamation-circle-fill me-2" />}
          {message}
        </div>
      </BootstrapAlert>
    </div>
  )
}
