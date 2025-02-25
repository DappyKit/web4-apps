import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Mock provider for Wagmi
 * @param props - Component props including children
 * @returns React component wrapped in WagmiProvider
 */
function MockWagmiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <WagmiProvider>{children}</WagmiProvider>;
}

/**
 * Wraps components with all necessary providers for testing
 * @param props - Component props including children
 * @returns React component wrapped in all providers
 */
function AllTheProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MockWagmiProvider>{children}</MockWagmiProvider>
    </QueryClientProvider>
  );
}

export { MockWagmiProvider, AllTheProviders };