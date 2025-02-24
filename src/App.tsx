import { useEffect, useState } from 'react'
import { SDK, Config } from '@dappykit/sdk'
import { Header } from './Header/Header'
import { FooterNoAuth } from './FooterNoAuth'
import { useAppSelector } from './redux/hooks'
import { selectAuth } from './redux/reducers/authSlice'
import { MainLogged } from './MainLogged'
import { MainNoAuth } from './MainNoAuth'
import { BrowserRouter, Navigate, useLocation } from 'react-router-dom'

function AppContent() {
  const auth = useAppSelector(selectAuth)
  const location = useLocation()
  const [userRegistered, setUserRegistered] = useState<boolean | null>(null)
  
  useEffect(() => {
    document.body.className = auth.isAuthenticated ? '' : 'p-1 p-lg-2'
  }, [auth.isAuthenticated])

  useEffect(() => {
    if (auth.isAuthenticated && auth.address) {
      checkUserRegistration(auth.address);
    }
  }, [auth.isAuthenticated, auth.address]);

  const checkUserRegistration = async (address: string) => {
    try {
      const response = await fetch(`/api/check/${address}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUserRegistered(data.isRegistered);
      console.log('User registration status:', data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error checking registration:', errorMessage);
      setUserRegistered(null);
    }
  };

  // If trying to access a protected route while not authenticated
  if (!auth.isAuthenticated && location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  return (
    <div className={auth.isAuthenticated ? '' : 'overflow-x-hidden rounded-top-4 pt-2 pt-lg-4'}>
      {!auth.isAuthenticated ? <Header/> : <></>}
      {auth.isAuthenticated ? <MainLogged userRegistered={userRegistered}/> : <MainNoAuth/>}
      {!auth.isAuthenticated ? <FooterNoAuth/> : <></>}
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
