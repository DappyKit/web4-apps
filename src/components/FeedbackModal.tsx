import { useState } from 'react'
import { Modal, Button, Form, Spinner } from 'react-bootstrap'
import { submitFeedback } from '../services/api'

interface FeedbackModalProps {
  show: boolean
  onHide: () => void
}

// Maximum allowed length for feedback
const MAX_FEEDBACK_LENGTH = 2000

/**
 * Modal component for collecting user feedback
 * @param props Component properties
 * @returns React component
 */
export function FeedbackModal({ show, onHide }: FeedbackModalProps): React.JSX.Element {
  const [feedbackText, setFeedbackText] = useState('')
  const [includeEmail, setIncludeEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('Thank you for your feedback!')

  // Calculate remaining characters
  const remainingChars = MAX_FEEDBACK_LENGTH - feedbackText.length
  const isOverLimit = remainingChars < 0

  /**
   * Handles the feedback form submission
   * @param e The form submit event
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!feedbackText.trim()) {
      setError('Please provide feedback before submitting')
      return
    }

    if (feedbackText.length > MAX_FEEDBACK_LENGTH) {
      setError(`Feedback exceeds maximum allowed length of ${String(MAX_FEEDBACK_LENGTH)} characters`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Submit feedback using the API service
      const response = await submitFeedback(feedbackText, includeEmail ? email : undefined)
      setSuccessMessage(response.message)
      setSubmitted(true)
      setFeedbackText('')
      setEmail('')
      setIncludeEmail(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again later.')
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handles changes to the feedback text
   * @param e Change event from textarea
   */
  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setFeedbackText(e.target.value)
  }

  /**
   * Resets the form state when the modal is closed
   */
  const handleClose = (): void => {
    if (!isSubmitting) {
      setFeedbackText('')
      setEmail('')
      setIncludeEmail(false)
      setError(null)
      setSubmitted(false)
      setSuccessMessage('Thank you for your feedback!')
      onHide()
    }
  }

  return (
    <Modal show={show} onHide={handleClose} centered dialogClassName="feedback-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title>Provide feedback</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-0">
        {submitted ? (
          <div className="text-center py-4">
            <div className="mb-3">
              <i className="bi bi-check-circle-fill text-success fs-1"></i>
            </div>
            <h5>{successMessage}</h5>
            <p className="text-muted">We read every piece of feedback, and take your input very seriously.</p>
            <Button
              variant="primary"
              onClick={handleClose}
              className="mt-3 px-4"
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            >
              Close
            </Button>
          </div>
        ) : (
          <Form
            onSubmit={e => {
              void handleSubmit(e)
            }}
          >
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="d-flex justify-content-between align-items-start mb-1 mt-3">
              <Form.Label className="mb-0">
                We read every piece of feedback, and take your input very seriously.
              </Form.Label>
            </div>
            <div className="text-end mb-2">
              <small className={isOverLimit ? 'text-danger' : 'text-muted'}>
                {remainingChars} characters remaining
              </small>
            </div>

            <Form.Group className="mb-4">
              <Form.Control
                as="textarea"
                rows={5}
                value={feedbackText}
                onChange={handleFeedbackChange}
                placeholder="Tell us what's on your mind..."
                disabled={isSubmitting}
                maxLength={MAX_FEEDBACK_LENGTH}
                isInvalid={isOverLimit}
                className="feedback-textarea"
              />
              {isOverLimit && (
                <Form.Control.Feedback type="invalid">
                  Feedback exceeds maximum length of {String(MAX_FEEDBACK_LENGTH)} characters.
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                id="include-email"
                label="Include my email address so I can be contacted"
                checked={includeEmail}
                onChange={e => {
                  setIncludeEmail(e.target.checked)
                }}
                disabled={isSubmitting}
              />
            </Form.Group>

            {includeEmail && (
              <Form.Group className="mb-4">
                <Form.Control
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                  }}
                  disabled={isSubmitting}
                  required={includeEmail}
                />
              </Form.Group>
            )}

            <div className="d-flex justify-content-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2"
                style={{
                  background: '#f97316',
                  borderColor: '#f97316',
                  color: 'white',
                  borderRadius: '6px',
                  width: '140px',
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || isOverLimit}
                className="px-5 py-2"
                style={{
                  background: '#7c3aed',
                  borderColor: '#7c3aed',
                  borderRadius: '6px',
                  width: '180px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit feedback'
                )}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
      <style>{`
        .feedback-modal .modal-content {
          border-radius: 12px;
          border: none;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .feedback-textarea {
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 12px;
          resize: none;
          font-size: 1rem;
        }
        .feedback-textarea:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 0.25rem rgba(124, 58, 237, 0.25);
        }
        .modal-header .btn-close:focus {
          box-shadow: none;
        }
      `}</style>
    </Modal>
  )
}
