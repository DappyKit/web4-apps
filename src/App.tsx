import { useEffect } from 'react'
import { SDK, Config } from '@dappykit/sdk'
import { Header } from './Header/Header'
import { FooterNoAuth } from './FooterNoAuth'
import { useAppSelector } from './redux/hooks.ts'
import { selectAuth } from './redux/reducers/authSlice.ts'
import { MainLogged } from './MainLogged.tsx'
import { MainNoAuth } from './MainNoAuth.tsx'
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom'

function AppContent() {
  const auth = useAppSelector(selectAuth)
  const location = useLocation()
  
  useEffect(() => {
    document.body.className = auth.isAuthenticated ? '' : 'p-1 p-lg-2'
  }, [auth.isAuthenticated])

  // If trying to access a protected route while not authenticated
  if (!auth.isAuthenticated && location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  return (
    <div className={auth.isAuthenticated ? '' : 'overflow-x-hidden rounded-top-4 pt-2 pt-lg-4'}>
      {auth.isAuthenticated ? <></> : <Header/>}
      {auth.isAuthenticated ? <MainLogged/> : <MainNoAuth/>}
      {auth.isAuthenticated ? null : <FooterNoAuth/>}
    </div>
  )
}

function App() {
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

export default App
