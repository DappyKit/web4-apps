import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { customRender as render } from '../../test/test-utils-helpers'
import { Dashboard } from '../Dashboard'
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
  getMyTemplates: vi.fn(),
  getSubmissionsStatus: vi.fn(),
}))

describe('Dashboard Component', () => {
  const mockAddress = '0x123...'
  const mockSignMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations with proper typing
    ;(wagmi.useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(wagmi.useSignMessage as Mock).mockReturnValue({
      signMessageAsync: mockSignMessage,
    })
    ;(api.checkUserRegistration as Mock).mockResolvedValue(false)
    ;(api.getSubmissionsStatus as Mock).mockResolvedValue({ areSubmissionsEnabled: true })
  })

  it('displays registration prompt when not registered', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Ready to join Web4 World\?/)).toBeInTheDocument()
      expect(screen.getByText(/Register now to create apps, share templates/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Register Now' })).toBeInTheDocument()
    })
  })

  it('displays apps when user is registered', async () => {
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

    const mockTemplates = [
      {
        id: '1',
        title: 'Test Template',
        description: 'Test Template Description',
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString(),
      },
    ]

    // Set user as registered with proper typing
    ;(api.checkUserRegistration as Mock).mockResolvedValue(true)
    ;(api.getMyApps as Mock).mockResolvedValue(mockApps)
    ;(api.getMyTemplates as Mock).mockResolvedValue(mockTemplates)

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('My Apps')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })
  })

  it('handles registration error', async () => {
    const errorMessage = 'Registration failed'
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage))
    ;(api.registerUser as Mock).mockRejectedValueOnce(new Error(errorMessage))

    render(<Dashboard />)

    const registerButton = await screen.findByText('Register Now')
    fireEvent.click(registerButton)

    await waitFor(() => {
      const errorElements = screen.getAllByText(content => content.includes(errorMessage))
      expect(errorElements.length).toBeGreaterThan(0)
    })
  })
})
