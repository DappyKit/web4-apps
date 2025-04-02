import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'

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
  if (isRegistered) {
    return (
      <Button variant="primary" onClick={onClick} className="btn-sm d-flex align-items-center gap-2">
        <i className={`bi ${icon} d-flex align-items-center`}></i>
        {label}
      </Button>
    )
  }

  return (
    <OverlayTrigger
      placement="left"
      overlay={
        <Tooltip id="register-tooltip">
          Please register your account on the Dashboard page before creating {label.toLowerCase().replace('new ', '')}
        </Tooltip>
      }
    >
      <span>
        <Button variant="primary" className="btn-sm d-flex align-items-center gap-2" disabled>
          <i className={`bi ${icon} d-flex align-items-center`}></i>
          {label}
        </Button>
      </span>
    </OverlayTrigger>
  )
}
