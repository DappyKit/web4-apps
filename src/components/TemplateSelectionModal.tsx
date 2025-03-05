import { Button, Modal, Table } from 'react-bootstrap'
import type { Template } from '../services/api'

interface TemplateSelectionModalProps {
  show: boolean
  onHide: () => void
  templates: Template[]
  onSelect: (template: Template) => void
}

/**
 * Modal component for selecting a template
 * @param props Component properties
 * @returns React component
 */
export function TemplateSelectionModal({
  show,
  onHide,
  templates,
  onSelect,
}: TemplateSelectionModalProps): React.JSX.Element {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Select a Template</Modal.Title>
      </Modal.Header>
      <Modal.Body className="mb-4">
        {templates.length === 0 ? (
          <p className="text-center">No templates available. Please create a template first.</p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template.id}>
                  <td>{template.id}</td>
                  <td>{template.title}</td>
                  <td>{template.description ?? '-'}</td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onSelect(template)
                        onHide()
                      }}
                    >
                      Select
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
