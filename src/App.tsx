import { useEffect } from 'react'
import { SDK, Config } from '@dappykit/sdk'
import { Header } from './Header/Header'
import { FooterNoAuth } from './FooterNoAuth'
import { useAppSelector } from './redux/hooks'
import { selectAuth } from './redux/reducers/authSlice'
import { MainLogged } from './MainLogged'
import { MainNoAuth } from './MainNoAuth'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TopAppCreators } from './pages/TopAppCreators'
import { Winners } from './pages/Winners'

/**
 * Main content component that handles authentication state and routing
 * @returns {React.JSX.Element} The main content of the application with conditional rendering based on auth state
 */
function AppContent(): React.JSX.Element {
  const auth = useAppSelector(selectAuth)
  const location = useLocation()

  useEffect(() => {
    document.body.className = auth.isAuthenticated ? '' : 'p-1 p-lg-2'
  }, [auth.isAuthenticated])

  // Special case for top-creators and winners - accessible to both authenticated and non-authenticated users
  if (location.pathname === '/top-creators' || location.pathname === '/winners') {
    return (
      <div className={auth.isAuthenticated ? '' : 'overflow-x-hidden rounded-top-4 pt-2 pt-lg-4'}>
        {!auth.isAuthenticated && <Header />}
        <Routes>
          <Route path="/top-creators" element={<TopAppCreators />} />
          <Route path="/winners" element={<Winners />} />
        </Routes>
        {!auth.isAuthenticated && <FooterNoAuth />}
      </div>
    )
  }

  // If trying to access root path while authenticated, redirect to dashboard
  if (auth.isAuthenticated && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className={auth.isAuthenticated ? '' : 'overflow-x-hidden rounded-top-4 pt-2 pt-lg-4'}>
      {!auth.isAuthenticated ? <Header /> : <></>}
      {auth.isAuthenticated ? <MainLogged /> : <MainNoAuth />}
      {!auth.isAuthenticated ? <FooterNoAuth /> : <></>}
    </div>
  )
}

/**
 * Root application component
 * @returns {React.JSX.Element} The root application component
 */
export default function App(): React.JSX.Element {
  useEffect(() => {
    const sdk = new SDK(Config.optimismMainnetConfig)
    console.log('sdk', sdk)
  }, [])

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
