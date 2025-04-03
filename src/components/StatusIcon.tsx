import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { CheckCircleFill, Calendar3 } from 'react-bootstrap-icons'

interface StatusIconProps {
  /** Type of status icon to display */
  type: 'moderated' | 'created'
  /** Value to display in the tooltip (e.g., date for 'created' type) */
  value?: string
  /** Unique ID for the tooltip */
  id: string
  /** Size of the icon (default: 16) */
  size?: number
}

interface IconConfig {
  icon: React.ReactNode
  tooltip: string
  className: string
}

/**
 * Renders a status icon with a tooltip explanation
 * @param {StatusIconProps} props - Component props
 * @returns {JSX.Element} Status icon with tooltip
 */
const StatusIcon: React.FC<StatusIconProps> = ({ type, value, id, size = 16 }): React.JSX.Element | null => {
  const getIconConfig = (): IconConfig => {
    switch (type) {
      case 'moderated':
        return {
          icon: <CheckCircleFill className="text-success" size={size} />,
          tooltip: 'Verified by moderators',
          className: 'moderation-badge',
        }
      case 'created':
        return {
          icon: <Calendar3 size={size} />,
          tooltip: `Created: ${value ?? 'N/A'}`,
          className: 'date-badge',
        }
      default:
        return {
          icon: null,
          tooltip: '',
          className: '',
        }
    }
  }

  const { icon, tooltip, className } = getIconConfig()

  if (!icon) return null

  return (
    <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-${type}-${id}`}>{tooltip}</Tooltip>}>
      <span className={`${className} d-flex align-items-center me-2`}>{icon}</span>
    </OverlayTrigger>
  )
}

export default StatusIcon
