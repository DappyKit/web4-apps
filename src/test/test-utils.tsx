import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient()

// Mock minimal wagmi config for testing
const mockConfig: Config = {
  chains: [],
  transports: {}
}

/**
 * Mock provider for Wagmi
 * @param props - Component props including children
 * @returns React component wrapped in WagmiProvider
 */
export function MockWagmiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <WagmiProvider config={mockConfig}>
      {children}
    </WagmiProvider>
  )
}

/**
 * Wraps components with all necessary providers for testing
 * @param props - Component props including children
 * @returns React component wrapped in all providers
 */
export function AllTheProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <MockWagmiProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </MockWagmiProvider>
    </QueryClientProvider>
  )
}