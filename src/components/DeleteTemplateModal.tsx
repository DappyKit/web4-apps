import React from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'

interface DeleteTemplateModalProps {
  show: boolean
  onHide: () => void
  isDeleting: boolean
  onConfirmDelete: () => void
}

/**
 * Modal component for confirming template deletion
 * @param props Component properties
 * @returns React component
 */
export function DeleteTemplateModal({
  show,
  onHide,
  isDeleting,
  onConfirmDelete,
}: DeleteTemplateModalProps): React.JSX.Element {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Delete Template</Modal.Title>
      </Modal.Header>
      <Modal.Body className="mb-4">
        <p>Are you sure you want to delete this template?</p>
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Warning: Some apps might be using this template. Deleting it will not affect existing apps, but they may lose
          access to the template&apos;s source.
        </Alert>
      </Modal.Body>
      <Modal.Footer className="mt-3">
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirmDelete} disabled={isDeleting}>
          {isDeleting ? (
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
  )
}
