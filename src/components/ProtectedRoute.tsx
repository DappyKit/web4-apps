import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../redux/hooks'
import { selectAuth } from '../redux/reducers/authSlice'

export function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const auth = useAppSelector(selectAuth)

  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
