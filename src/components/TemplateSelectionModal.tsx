import { useState, useMemo } from 'react'
import { Button, Modal, Table, Form, Nav } from 'react-bootstrap'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Get current user address from localStorage to identify user's templates
  const currentUserAddress = localStorage.getItem('userAddress')?.toLowerCase() ?? ''

  // Split templates into user's and public, and filter by search term
  const { userTemplates, publicTemplates, allFilteredTemplates } = useMemo(() => {
    const filteredTemplates = templates.filter(template => {
      return (
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      )
    })

    const userTemps = filteredTemplates.filter(
      template => template.owner_address.toLowerCase() === currentUserAddress
    )
    const publicTemps = filteredTemplates.filter(
      template => template.owner_address.toLowerCase() !== currentUserAddress
    )

    return {
      userTemplates: userTemps,
      publicTemplates: publicTemps,
      allFilteredTemplates: filteredTemplates
    }
  }, [templates, searchTerm, currentUserAddress])

  // Get the templates to display based on active tab
  const templatesForActiveTab = activeTab === 'all' 
    ? allFilteredTemplates 
    : activeTab === 'mine' 
      ? userTemplates 
      : publicTemplates

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Select a Template</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form className="mb-3">
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
              }}
            />
          </Form.Group>
        </Form>

        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'all'} 
              onClick={() => {
                setActiveTab('all')
              }}
            >
              All Templates
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'mine'} 
              onClick={() => {
                setActiveTab('mine')
              }}
            >
              My Templates
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'public'} 
              onClick={() => {
                setActiveTab('public')
              }}
            >
              Public Templates
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {templatesForActiveTab.length === 0 ? (
          <p className="text-center py-3">
            {activeTab === 'mine' 
              ? "You don't have any templates yet." 
              : activeTab === 'public' 
                ? "No public templates found." 
                : "No templates found."}
          </p>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Actions</th>
                <th>Title</th>
                <th>Description</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {templatesForActiveTab.map(template => (
                <tr key={template.id}>
                  <td className="text-center">
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
                  <td>{template.title}</td>
                  <td>{template.description ?? '-'}</td>
                  <td>{template.id}</td>
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
