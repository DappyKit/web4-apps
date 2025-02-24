import { describe, it, vi, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { Dashboard } from '../Dashboard';
import * as wagmi from 'wagmi';
import * as api from '../../services/api';

// Define types for mocked functions
interface MockedFunction<T> {
  mockResolvedValue: (value: Awaited<ReturnType<T>>) => void;
  mockResolvedValueOnce: (value: Awaited<ReturnType<T>>) => void;
  mockRejectedValue: (error: Error) => void;
  mockRejectedValueOnce: (error: Error) => void;
  mockReturnValue: (value: ReturnType<T>) => void;
  mockReturnValueOnce: (value: ReturnType<T>) => void;
}

// Helper function for type-safe mocking
function createMock<T>(): MockedFunction<T> {
  return {
    mockResolvedValue: vi.fn(),
    mockResolvedValueOnce: vi.fn(),
    mockRejectedValue: vi.fn(),
    mockRejectedValueOnce: vi.fn(),
    mockReturnValue: vi.fn(),
    mockReturnValueOnce: vi.fn(),
  };
}

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
    
    // Default mock implementations with proper types
    (wagmi.useAccount as unknown as MockedFunction<typeof wagmi.useAccount>)
      .mockReturnValue({ address: mockAddress });
    (wagmi.useSignMessage as unknown as MockedFunction<typeof wagmi.useSignMessage>)
      .mockReturnValue({ signMessageAsync: mockSignMessage });

    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(false);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    const getMyAppsMock = createMock<typeof api.getMyApps>();
    getMyAppsMock.mockResolvedValue([]);
    Object.assign(api.getMyApps, getMyAppsMock);
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

    const registerUserMock = createMock<typeof api.registerUser>();
    registerUserMock.mockResolvedValueOnce(true);
    Object.assign(api.registerUser, registerUserMock);

    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValueOnce(false);
    checkUserRegistrationMock.mockResolvedValueOnce(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

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

    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    const getMyAppsMock = createMock<typeof api.getMyApps>();
    getMyAppsMock.mockResolvedValue(mockApps);
    Object.assign(api.getMyApps, getMyAppsMock);

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

    // Then check for apps
    await waitFor(() => {
      expect(screen.getByText('My Apps')).toBeInTheDocument();
      expect(screen.getByText('Test App')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('handles app creation', async () => {
    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    mockSignMessage.mockResolvedValueOnce('mock-signature');

    const createAppMock = createMock<typeof api.createApp>();
    createAppMock.mockResolvedValueOnce({ id: '2', name: 'New App' });
    Object.assign(api.createApp, createAppMock);
    
    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

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

    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    const getMyAppsMock = createMock<typeof api.getMyApps>();
    getMyAppsMock.mockResolvedValue(mockApps);
    Object.assign(api.getMyApps, getMyAppsMock);

    mockSignMessage.mockResolvedValueOnce('mock-signature');

    const deleteAppMock = createMock<typeof api.deleteApp>();
    deleteAppMock.mockResolvedValueOnce(true);
    Object.assign(api.deleteApp, deleteAppMock);

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

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
    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    const errorMessage = 'Failed to create app';
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

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

    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    const getMyAppsMock = createMock<typeof api.getMyApps>();
    getMyAppsMock.mockResolvedValue(mockApps);
    Object.assign(api.getMyApps, getMyAppsMock);

    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

    const deleteButton = await screen.findByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows empty state when no apps exist', async () => {
    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    const getMyAppsMock = createMock<typeof api.getMyApps>();
    getMyAppsMock.mockResolvedValue([]);
    Object.assign(api.getMyApps, getMyAppsMock);

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("You don't have any apps yet. Create one to get started!")).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching apps', async () => {
    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    let resolveGetApps: (value: Awaited<ReturnType<typeof api.getMyApps>>) => void;
    const getAppsPromise = new Promise<Awaited<ReturnType<typeof api.getMyApps>>>((resolve) => {
      resolveGetApps = resolve;
    });

    const getMyAppsMock = createMock<typeof api.getMyApps>();
    getMyAppsMock.mockReturnValue(getAppsPromise);
    Object.assign(api.getMyApps, getMyAppsMock);

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    resolveGetApps([]);
  });

  it('disables buttons during loading states', async () => {
    const checkUserRegistrationMock = createMock<typeof api.checkUserRegistration>();
    checkUserRegistrationMock.mockResolvedValue(true);
    Object.assign(api.checkUserRegistration, checkUserRegistrationMock);

    let resolveCreateApp: (value: Awaited<ReturnType<typeof api.createApp>>) => void;
    const createAppPromise = new Promise<Awaited<ReturnType<typeof api.createApp>>>((resolve) => {
      resolveCreateApp = resolve;
    });

    const createAppMock = createMock<typeof api.createApp>();
    createAppMock.mockReturnValue(createAppPromise);
    Object.assign(api.createApp, createAppMock);

    mockSignMessage.mockResolvedValue('mock-signature');

    render(<Dashboard />);

    // Wait for registration check to complete
    await waitFor(() => {
      expect(api.checkUserRegistration).toHaveBeenCalled();
    });

    const createButton = await screen.findByText('Create Random App');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createButton).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    resolveCreateApp({ id: '1', name: 'New App' });
  });
}); 