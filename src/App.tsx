import { useEffect } from 'react'
import { SDK, Config } from '@dappykit/sdk'
import { Header } from './Header/Header'
import { FooterNoAuth } from './FooterNoAuth'
import { useAppSelector } from './redux/hooks.ts'
import { selectAuth } from './redux/reducers/authSlice.ts'
import { MainLogged } from './MainLogged.tsx'
import { MainNoAuth } from './MainNoAuth.tsx'

function App() {
  const auth = useAppSelector(selectAuth)

  useEffect(() => {
    const sdk = new SDK(Config.optimismMainnetConfig)
    console.log('sdk', sdk)
  }, [])

  return (
    <>
      <div className={auth.isAuthenticated ? '' : 'overflow-x-hidden rounded-top-4 pt-2 pt-lg-4'}>
        {auth.isAuthenticated ? <></> : <Header/>}

        {auth.isAuthenticated ? <MainLogged/> : <MainNoAuth/>}

        {auth.isAuthenticated ? null : <FooterNoAuth/>}
      </div>
    </>
  )
}

export default App
