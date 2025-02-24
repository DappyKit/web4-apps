import { describe, it, vi, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { Dashboard } from '../Dashboard';
import * as wagmi from 'wagmi';
import * as api from '../../services/api';
import type { Mock } from 'vitest';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSignMessage: vi.fn(),
  WagmiConfig: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock API services
vi.mock('../../services/api', () => ({
  checkUserRegistration: vi.fn(),
  registerUser: vi.fn(),
  getMyApps: vi.fn(),
  createApp: vi.fn(),
  deleteApp: vi.fn(),
}));

describe('Dashboard Component', () => {
  const mockAddress = '0x123...';
  const mockSignMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (wagmi.useAccount as Mock)
      .mockReturnValue({ address: mockAddress, isConnected: true });
    (wagmi.useSignMessage as Mock)
      .mockReturnValue({ signMessageAsync: mockSignMessage });

    // Default to unregistered state
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(false);
    (api.getMyApps as Mock)
      .mockResolvedValue([]);
  });

  it('shows registration button when user is not registered', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Registration Required')).toBeInTheDocument();
      expect(screen.getByText('Register Now')).toBeInTheDocument();
    });
  });

  it('handles successful registration', async () => {
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.registerUser as Mock)
      .mockResolvedValueOnce(true);
    
    // First check returns false (unregistered), second check returns true (registered)
    (api.checkUserRegistration as Mock)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    render(<Dashboard />);
    
    const registerButton = await screen.findByText('Register Now');
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(api.registerUser).toHaveBeenCalledWith(
        mockAddress,
        'Web4 Apps Registration',
        'mock-signature'
      );
    });
  });

  it('displays apps when user is registered', async () => {
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

    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    (api.getMyApps as Mock)
      .mockResolvedValue(mockApps);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('My Apps')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('handles app creation', async () => {
    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.createApp as Mock)
      .mockResolvedValueOnce({ 
        id: 2, 
        name: 'New App', 
        description: '', 
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString()
      });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Random App')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Random App');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(api.createApp).toHaveBeenCalled();
      expect(mockSignMessage).toHaveBeenCalled();
    });
  });

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

    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    (api.getMyApps as Mock)
      .mockResolvedValue(mockApps);
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.deleteApp as Mock)
      .mockResolvedValueOnce(true);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(api.deleteApp).toHaveBeenCalledWith(
        mockAddress,
        1,
        'mock-signature'
      );
    });
  });

  it('handles registration error', async () => {
    const errorMessage = 'Registration failed';
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);
    
    const registerButton = await screen.findByText('Register Now');
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles app creation error', async () => {
    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    
    const errorMessage = 'Failed to create app';
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Random App')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Random App');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles app deletion error', async () => {
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
    const errorMessage = 'Failed to delete app';

    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    (api.getMyApps as Mock)
      .mockResolvedValue(mockApps);
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows empty state when no apps exist', async () => {
    // Set user as registered but with no apps
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    (api.getMyApps as Mock)
      .mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("You don't have any apps yet. Create one to get started!")).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching apps', async () => {
    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    
    // Delay the getMyApps response to ensure we see the loading state
    (api.getMyApps as Mock)
      .mockImplementation(() => new Promise(resolve => {
        setTimeout(() => {
          resolve([]);
        }, 100);
      }));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('disables buttons during loading states', async () => {
    // Set user as registered
    (api.checkUserRegistration as Mock)
      .mockResolvedValue(true);
    
    // Mock a delayed response for createApp to test loading state
    (api.createApp as Mock)
      .mockImplementation(() => new Promise(resolve => {
        setTimeout(() => {
          resolve({ 
            id: 1, 
            name: 'New App', 
            description: '', 
            created_at: new Date().toISOString(),
            owner_address: mockAddress,
            updated_at: new Date().toISOString()
          });
        }, 100);
      }));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Random App')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Random App');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createButton).toBeDisabled();
    });
  });
}); 