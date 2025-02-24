import { describe, it, vi, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { MyApps } from '../MyApps';
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
  createApp: vi.fn(),
  getMyApps: vi.fn(),
  deleteApp: vi.fn(),
}));

describe('MyApps Component', () => {
  const mockAddress = '0x123...';
  const mockSignMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (wagmi.useAccount as Mock)
      .mockReturnValue({ address: mockAddress, isConnected: true });
    (wagmi.useSignMessage as Mock)
      .mockReturnValue({ signMessageAsync: mockSignMessage });
    (api.getMyApps as Mock)
      .mockResolvedValue([]);
  });

  it('renders the create app form', () => {
    render(<MyApps />);
    
    expect(screen.getByText('Create New App')).toBeInTheDocument();
    expect(screen.getByLabelText(/App Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create App' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<MyApps />);
    
    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('App name is required')).toBeInTheDocument();
    });
  });

  it('validates app name length', async () => {
    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    fireEvent.change(nameInput, { target: { value: 'a' } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('App name must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('validates maximum app name length', async () => {
    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(256) } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('App name must be less than 255 characters')).toBeInTheDocument();
    });
  });

  it('validates maximum description length', async () => {
    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.change(descriptionInput, { target: { value: 'A'.repeat(1001) } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Description must be less than 1000 characters')).toBeInTheDocument();
    });
  });

  it('validates trimmed name length', async () => {
    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    // Add spaces to make it look longer than 3 chars, but trimmed is less
    fireEvent.change(nameInput, { target: { value: '  a  ' } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('App name must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('validates trimmed description length', () => {
    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    // Add spaces to make it 1001 characters after trim
    fireEvent.change(descriptionInput, { target: { value: `  ${('A'.repeat(999))}  ` } });

    expect(screen.getByText(`(999/${String(1000)})`)).toBeInTheDocument();
  });

  it('shows character count for name and description', () => {
    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    
    fireEvent.change(nameInput, { target: { value: 'Test Name' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    expect(screen.getByText('(9/255)')).toBeInTheDocument(); // "Test Name" length
    expect(screen.getByText('(16/1000)')).toBeInTheDocument(); // "Test Description" length
  });

  it('successfully creates an app with trimmed values', async () => {
    const newApp = {
      id: '1',
      name: 'Test App',
      description: 'Test Description',
      created_at: new Date().toISOString(),
      owner_address: mockAddress,
      updated_at: new Date().toISOString()
    };

    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.createApp as Mock).mockResolvedValueOnce(newApp);
    (api.getMyApps as Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([newApp]);

    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    
    // Add extra spaces that should be trimmed
    fireEvent.change(nameInput, { target: { value: '  Test App  ' } });
    fireEvent.change(descriptionInput, { target: { value: '  Test Description  ' } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(api.createApp).toHaveBeenCalledWith(
        mockAddress,
        'Test App', // Should be trimmed
        'Test Description', // Should be trimmed
        'mock-signature'
      );
    });

    expect(await screen.findByText('App created successfully!')).toBeInTheDocument();
  });

  it('handles app creation error', async () => {
    const errorMessage = 'Failed to create app';
    mockSignMessage.mockRejectedValueOnce(new Error(errorMessage));

    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    
    fireEvent.change(nameInput, { target: { value: 'Test App' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('disables form submission while creating', async () => {
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.createApp as Mock).mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        resolve({
          id: '1',
          name: 'Test App',
          description: 'Test Description',
          created_at: new Date().toISOString(),
          owner_address: mockAddress,
          updated_at: new Date().toISOString()
        });
      }, 100);
    }));

    render(<MyApps />);
    
    const nameInput = screen.getByLabelText(/App Name/);
    const descriptionInput = screen.getByLabelText(/Description/);
    
    fireEvent.change(nameInput, { target: { value: 'Test App' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    const createButton = screen.getByRole('button', { name: 'Create App' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createButton).toBeDisabled();
    });
  });

  it('displays apps list', async () => {
    const mockApps = [
      { 
        id: '1', 
        name: 'Test App 1', 
        description: 'Test Description 1', 
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString()
      },
      { 
        id: '2', 
        name: 'Test App 2', 
        description: 'Test Description 2', 
        created_at: new Date().toISOString(),
        owner_address: mockAddress,
        updated_at: new Date().toISOString()
      }
    ];

    (api.getMyApps as Mock).mockResolvedValue(mockApps);

    render(<MyApps />);

    await waitFor(() => {
      expect(screen.getByText('Your Apps')).toBeInTheDocument();
      expect(screen.getByText('Test App 1')).toBeInTheDocument();
      expect(screen.getByText('Test App 2')).toBeInTheDocument();
      expect(screen.getByText('Test Description 1')).toBeInTheDocument();
      expect(screen.getByText('Test Description 2')).toBeInTheDocument();
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

    (api.getMyApps as Mock)
      .mockResolvedValueOnce(mockApps)
      .mockResolvedValueOnce([]);
    mockSignMessage.mockResolvedValueOnce('mock-signature');
    (api.deleteApp as Mock).mockResolvedValueOnce(true);

    render(<MyApps />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.queryByText('Test App')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while fetching apps', () => {
    (api.getMyApps as Mock).mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        resolve([]);
      }, 100);
    }));

    render(<MyApps />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no apps exist', async () => {
    (api.getMyApps as Mock).mockResolvedValue([]);

    render(<MyApps />);

    await waitFor(() => {
      expect(screen.getByText("You don't have any apps yet. Create one using the form above!")).toBeInTheDocument();
    });
  });
}); 