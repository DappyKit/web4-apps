import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { BrowserRouter } from 'react-router-dom'
import { ReactNode, JSX } from 'react'
import { Provider } from 'react-redux'
import { store } from '../redux/store'

const queryClient = new QueryClient()

/**
 * Mock provider for Wagmi
 * @param props - Component props including children
 * @returns React component wrapped in WagmiProvider
 */
export function MockWagmiProvider({ children }: { children: ReactNode }): JSX.Element {
  return <WagmiProvider config={{} as Config}>{children}</WagmiProvider>
}

/**
 * Wraps components with all necessary providers for testing
 * @param props - Component props including children
 * @returns React component wrapped in all providers
 */
export function AllTheProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MockWagmiProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </MockWagmiProvider>
      </QueryClientProvider>
    </Provider>
  )
}
