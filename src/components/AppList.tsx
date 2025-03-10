import React from 'react'
import { Row, Col, Spinner } from 'react-bootstrap'
import type { App } from '../services/api'
import AppCard from './AppCard'

interface AppListProps {
  apps: App[]
  isLoading: boolean
  showEmptyMessage?: string
  onDeleteApp?: (appId: number) => Promise<void>
  isDeleting?: number | null
  showDelete?: boolean
}

/**
 * Renders a responsive grid of app cards with modern layout
 * @param {AppListProps} props - Component props
 * @returns {JSX.Element} App list component
 */
export function AppList({
  apps,
  isLoading,
  showEmptyMessage = 'No apps available.',
  onDeleteApp,
  isDeleting,
  showDelete = false,
}: AppListProps): React.JSX.Element {
  // Show spinner only on initial load when there are no apps yet
  if (isLoading && apps.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  }

  // Show empty message only when not loading and no apps
  if (!isLoading && apps.length === 0) {
    return (
      <div className="text-center mt-4 p-5 bg-light rounded-3">
        <h5 className="text-muted">{showEmptyMessage}</h5>
      </div>
    )
  }

  return (
    <Row xs={1} sm={2} md={2} lg={3} xl={4} className="g-4">
      {apps.map(app => (
        <Col key={app.id}>
          <AppCard
            app={app}
            showDelete={showDelete}
            isDeleting={isDeleting === app.id}
            onDelete={() => {
              if (onDeleteApp) {
                void onDeleteApp(app.id)
              }
            }}
          />
        </Col>
      ))}
    </Row>
  )
}
