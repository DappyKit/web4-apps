import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { useSubmissionsStatus } from '../hooks/useSubmissionsStatus'

interface NewActionButtonProps {
  isRegistered: boolean
  onClick: () => void
  label: string
  icon?: string
}

/**
 * Reusable button component that displays either an enabled action button or a disabled button with registration tooltip
 * @param isRegistered Whether the user is registered
 * @param onClick Function to call when the button is clicked (only if registered)
 * @param label Button text label
 * @param icon Optional icon class
 */
export function NewActionButton({
  isRegistered,
  onClick,
  label,
  icon = 'bi-plus-circle',
}: NewActionButtonProps): React.JSX.Element {
  const { areSubmissionsEnabled } = useSubmissionsStatus()

  // If user is registered and submissions are enabled, show active button
  if (isRegistered && areSubmissionsEnabled) {
    return (
      <Button variant="primary" onClick={onClick} className="btn-sm d-flex align-items-center gap-2">
        <i className={`bi ${icon} d-flex align-items-center`}></i>
        {label}
      </Button>
    )
  }

  // Determine tooltip message based on the reason for disabled state
  let tooltipMessage: string
  if (!isRegistered) {
    tooltipMessage = `Please register your account on the Dashboard page before creating ${label.toLowerCase().replace('new ', '')}`
  } else if (!areSubmissionsEnabled) {
    tooltipMessage =
      'Submissions are currently locked until calculation of hackathon results. Thank you for participation!'
  } else {
    tooltipMessage = 'Action not available'
  }

  return (
    <OverlayTrigger placement="left" overlay={<Tooltip id="action-tooltip">{tooltipMessage}</Tooltip>}>
      <span>
        <Button variant="primary" className="btn-sm d-flex align-items-center gap-2" disabled>
          <i className={`bi ${icon} d-flex align-items-center`}></i>
          {label}
        </Button>
      </span>
    </OverlayTrigger>
  )
}
