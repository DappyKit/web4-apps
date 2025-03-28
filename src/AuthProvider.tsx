import { ReactNode, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useDispatch } from 'react-redux'
import { login, logout } from './redux/reducers/authSlice.ts'

/**
 * Provider component that handles wallet authentication state
 * Automatically syncs wallet connection state with application auth state
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to be rendered
 * @returns {ReactNode} The wrapped children components
 */
const AuthProvider = ({ children }: { children: ReactNode }): ReactNode => {
  const { address, isConnected } = useAccount()
  const dispatch = useDispatch()

  useEffect(() => {
    if (isConnected && address) {
      // Store the user's wallet address in localStorage for template ownership check
      localStorage.setItem('userAddress', address)
      dispatch(login({ address }))
    } else {
      // Remove the address from localStorage when the user disconnects
      localStorage.removeItem('userAddress')
      dispatch(logout())
    }
  }, [isConnected, address, dispatch])

  return children
}

export default AuthProvider
