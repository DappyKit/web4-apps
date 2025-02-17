import './App.css'
import { useEffect } from 'react'
import { SDK, Config } from '@dappykit/sdk'
import { Header } from './Header/Header'
import { FooterLogged } from './FooterLogged'
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
        <div className="overflow-x-hidden rounded-top-4 pt-2 pt-lg-4">
          <Header/>

          {auth.isAuthenticated ? <MainLogged/> : <MainNoAuth/>}

          {/*{!auth.isAuthenticated && <Stata stata={stata}/>}*/}

          {auth.isAuthenticated ? <FooterLogged/> : <FooterNoAuth/>}
        </div>
      </>
  )
}

export default App
