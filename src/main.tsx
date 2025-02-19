import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/main.css'
import './css/utility.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.ts'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { optimism } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import AuthProvider from './AuthProvider.ts'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from https://cloud.reown.com
const projectId = 'b7c1f662defe320674c2e91a658462fc'
const metadata = {
  name: 'Web4 Apps',
  description: 'AppKit Example',
  url: 'https://reown.com/appkit', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// 3. Set the networks
const networks = [optimism]

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// 5. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [optimism],
  projectId,
  metadata,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <AuthProvider>
              <App/>
            </AuthProvider>
          </Provider>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>,
)
