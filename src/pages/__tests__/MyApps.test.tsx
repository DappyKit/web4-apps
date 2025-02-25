import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
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
}))

describe('MyApps Component', () => {
  const mockAddress = '0x123...'
  const mockSignMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (wagmi.useAccount as Mock).mockReturnValue({ 
      address: mockAddress, 
      isConnected: true 
    });
    (wagmi.useSignMessage as Mock).mockReturnValue({ 
      signMessageAsync: mockSignMessage 
    });
    (api.checkUserRegistration as Mock).mockResolvedValue(true)
  })

  it('displays loading state initially', () => {
    render(<MyApps />)
    expect(screen.getByText(/Loading/)).toBeInTheDocument()
  })

  it('displays apps when loaded', async () => {
    const mockApps = [
      { 
        id: '1', 
        name: 'Test App', 
        description: 'Test Description',
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString()
      }
    ];

    (api.getMyApps as Mock).mockResolvedValue(mockApps)

    render(<MyApps />)

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })
  })

  it('handles app deletion', async () => {
    const mockApps = [
      { 
        id: '1', 
        name: 'Test App', 
        description: 'Test Description',
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString()
      }
    ];

    (api.getMyApps as Mock).mockResolvedValue(mockApps)
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.deleteApp as Mock).mockResolvedValueOnce(true)

    render(<MyApps />)

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(api.deleteApp).toHaveBeenCalledWith(
        mockAddress,
        1,
        'mock-signature'
      )
    })
  })
}) 