import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '../redux/hooks'
import { selectAuth } from '../redux/reducers/authSlice'

/**
 * Component that protects routes requiring authentication
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be rendered when authenticated
 * @returns {React.JSX.Element} Protected route component
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const auth = useAppSelector(selectAuth)
  const location = useLocation()

  if (!auth.isAuthenticated) {
    // Redirect to home with the return url
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
