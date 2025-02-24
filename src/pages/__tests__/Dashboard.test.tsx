import { describe, it, vi, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { Dashboard } from '../Dashboard';
import { useAccount, useSignMessage } from 'wagmi';
import * as api from '../../services/api';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSignMessage: vi.fn(),
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
    (useAccount as any).mockReturnValue({ address: mockAddress });
    (useSignMessage as any).mockReturnValue({ signMessageAsync: mockSignMessage });
    (api.checkUserRegistration as any).mockResolvedValue(false);
    (api.getMyApps as any).mockResolvedValue([]);
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
    (api.registerUser as any).mockResolvedValueOnce(true);
    (api.checkUserRegistration as any)
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
      { id: '1', name: 'Test App', description: 'Test Description', created_at: new Date().toISOString() }
    ];

    (api.checkUserRegistration as any).mockResolvedValue(true);
    (api.getMyApps as any).mockResolvedValue(mockApps);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('My Apps')).toBeInTheDocument();
      expect(screen.getByText('Test App')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('handles app creation', async () => {
    (api.checkUserRegistration as any).mockResolvedValue(true);
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.createApp as any).mockResolvedValueOnce({ id: '2', name: 'New App' });
    
    render(<Dashboard />);

    const createButton = await screen.findByText('Create Random App');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(api.createApp).toHaveBeenCalled();
      expect(mockSignMessage).toHaveBeenCalled();
    });
  });

  it('handles app deletion', async () => {
    const mockApps = [
      { id: '1', name: 'Test App', description: 'Test Description', created_at: new Date().toISOString() }
    ];

    (api.checkUserRegistration as any).mockResolvedValue(true);
    (api.getMyApps as any).mockResolvedValue(mockApps);
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.deleteApp as any).mockResolvedValueOnce(true);

    render(<Dashboard />);

    const deleteButton = await screen.findByText('Delete');
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
    (api.checkUserRegistration as any).mockResolvedValue(true);
    const errorMessage = 'Failed to create app';
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);

    const createButton = await screen.findByText('Create Random App');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles app deletion error', async () => {
    const mockApps = [
      { id: '1', name: 'Test App', description: 'Test Description', created_at: new Date().toISOString() }
    ];
    const errorMessage = 'Failed to delete app';

    (api.checkUserRegistration as any).mockResolvedValue(true);
    (api.getMyApps as any).mockResolvedValue(mockApps);
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);

    const deleteButton = await screen.findByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows empty state when no apps exist', async () => {
    (api.checkUserRegistration as any).mockResolvedValue(true);
    (api.getMyApps as any).mockResolvedValue([]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("You don't have any apps yet. Create one to get started!")).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching apps', async () => {
    (api.checkUserRegistration as any).mockResolvedValue(true);
    let resolveGetApps: (value: any) => void;
    const getAppsPromise = new Promise((resolve) => {
      resolveGetApps = resolve;
    });
    (api.getMyApps as any).mockReturnValue(getAppsPromise);

    await act(async () => {
      render(<Dashboard />);
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    await act(async () => {
      resolveGetApps([]);
    });
  });

  it('disables buttons during loading states', async () => {
    (api.checkUserRegistration as any).mockResolvedValue(true);
    let resolveCreateApp: (value: any) => void;
    const createAppPromise = new Promise((resolve) => {
      resolveCreateApp = resolve;
    });
    (api.createApp as any).mockReturnValue(createAppPromise);
    mockSignMessage.mockResolvedValue('mock-signature');

    await act(async () => {
      render(<Dashboard />);
    });

    const createButton = await screen.findByText('Create Random App');
    
    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(createButton).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    await act(async () => {
      resolveCreateApp({ id: '1', name: 'New App' });
    });
  });
}); 