import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { customRender as render } from '../../test/test-utils-helpers'
import { MyTemplates } from '../MyTemplates'
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
  getMyTemplates: vi.fn(),
  deleteTemplate: vi.fn(),
  createTemplate: vi.fn(),
  getSubmissionsStatus: vi.fn(),
}))

describe('MyTemplates Component', () => {
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
    ;(api.getMyTemplates as Mock).mockResolvedValue([])
    ;(api.getSubmissionsStatus as Mock).mockResolvedValue({ areSubmissionsEnabled: true })
  })

  it('displays templates when loaded', async () => {
    const mockTemplates = [
      {
        id: 1,
        title: 'Test Template',
        description: 'Test Description',
        url: 'https://example.com',
        data: '{}',
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString(),
      },
    ]

    ;(api.getMyTemplates as Mock).mockResolvedValue(mockTemplates)

    render(<MyTemplates />)

    await waitFor(() => {
      expect(screen.getByText('Test Template')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })
  })

  it('disables New Template button when user is not registered', async () => {
    // Mock user as not registered
    ;(api.checkUserRegistration as Mock).mockResolvedValue(false)

    render(<MyTemplates />)

    await waitFor(() => {
      const newTemplateButton = screen.getByRole('button', { name: /New Template/i })
      expect(newTemplateButton).toBeDisabled()
    })
  })

  it('enables New Template button when user is registered', async () => {
    // Mock user as registered
    ;(api.checkUserRegistration as Mock).mockResolvedValue(true)

    render(<MyTemplates />)

    await waitFor(() => {
      const newTemplateButton = screen.getByRole('button', { name: /New Template/i })
      expect(newTemplateButton).not.toBeDisabled()
    })
  })
})
