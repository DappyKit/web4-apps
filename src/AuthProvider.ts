import { ReactNode, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useDispatch } from 'react-redux'
import { login, logout } from './redux/reducers/authSlice.ts'

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected } = useAccount()
  const dispatch = useDispatch()

  useEffect(() => {
    if (isConnected && address) {
      dispatch(login({ address }))
    } else {
      dispatch(logout())
    }
  }, [isConnected, address, dispatch])

  return children
}

export default AuthProvider
