import React, { useCallback } from 'react'
import { Button, Form, Modal, Spinner } from 'react-bootstrap'

interface FormData {
  title: string
  description: string
  url: string
  jsonData: string
}

type FormErrors = Record<keyof FormData, string | undefined>

interface CreateTemplateModalProps {
  show: boolean
  onHide: () => void
  formData: FormData
  errors: FormErrors
  isCreating: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
}

/**
 * Modal component for creating a new template
 * @param props Component properties
 * @returns React component
 */
export function CreateTemplateModal({
  show,
  onHide,
  formData,
  errors,
  isCreating,
  onChange,
  onSubmit,
}: CreateTemplateModalProps): React.JSX.Element {
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(e)
    },
    [onSubmit],
  )

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Create New Template</Modal.Title>
      </Modal.Header>
      <Modal.Body className="mb-4">
        <Form onSubmit={handleFormSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={onChange}
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
              onChange={onChange}
              isInvalid={!!errors.description}
            />
            {errors.description && <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>URL</Form.Label>
            <Form.Control type="text" name="url" value={formData.url} onChange={onChange} isInvalid={!!errors.url} />
            {errors.url && <Form.Control.Feedback type="invalid">{errors.url}</Form.Control.Feedback>}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>JSON Schema</Form.Label>
            <Form.Control
              as="textarea"
              name="jsonData"
              value={formData.jsonData}
              onChange={onChange}
              rows={10}
              isInvalid={!!errors.jsonData}
              style={{ fontFamily: 'monospace' }}
            />
            {errors.jsonData && <Form.Control.Feedback type="invalid">{errors.jsonData}</Form.Control.Feedback>}
          </Form.Group>

          <div className="d-flex justify-content-end mt-5">
            <Button variant="outline-secondary" className="me-2" onClick={onHide}>
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
  )
}
