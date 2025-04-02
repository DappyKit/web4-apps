import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { customRender as render } from '../../test/test-utils-helpers'
import { MyApps } from '../MyApps'
import * as wagmi from 'wagmi'
import * as api from '../../services/api'
import type { Mock } from 'vitest'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSignMessage: vi.fn(),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock API services
vi.mock('../../services/api', () => ({
  checkUserRegistration: vi.fn(),
  registerUser: vi.fn(),
  getMyApps: vi.fn(),
  deleteApp: vi.fn(),
  createApp: vi.fn(),
  getAllTemplatesForUser: vi.fn(),
}))

describe('MyApps Component', () => {
  const mockAddress = '0x123...'
  const mockSignMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    ;(wagmi.useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(wagmi.useSignMessage as Mock).mockReturnValue({
      signMessageAsync: mockSignMessage,
    })
    ;(api.checkUserRegistration as Mock).mockResolvedValue(true)
    ;(api.getMyApps as Mock).mockResolvedValue([])
    ;(api.getAllTemplatesForUser as Mock).mockResolvedValue({
      userTemplates: [],
      publicTemplates: [],
    })
  })

  it('displays loading state initially', () => {
    ;(api.getMyApps as Mock).mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    )
    ;(api.getAllTemplatesForUser as Mock).mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    )

    render(<MyApps />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays apps when loaded', async () => {
    const mockApps = [
      {
        id: '1',
        name: 'Test App',
        description: 'Test Description',
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString(),
      },
    ]

    ;(api.getMyApps as Mock).mockResolvedValue(mockApps)

    render(<MyApps />)

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })
  })

  it('disables New App button when user is not registered', async () => {
    // Mock user as not registered
    ;(api.checkUserRegistration as Mock).mockResolvedValue(false)

    render(<MyApps />)

    await waitFor(() => {
      const newAppButton = screen.getByRole('button', { name: /New App/i })
      expect(newAppButton).toBeDisabled()
    })
  })

  it('enables New App button when user is registered', async () => {
    // Mock user as registered
    ;(api.checkUserRegistration as Mock).mockResolvedValue(true)

    render(<MyApps />)

    await waitFor(() => {
      const newAppButton = screen.getByRole('button', { name: /New App/i })
      expect(newAppButton).not.toBeDisabled()
    })
  })

  // Remove the app deletion test since delete buttons are now only on view pages
  // We'll test deletion functionality in the ViewApp component tests
})
