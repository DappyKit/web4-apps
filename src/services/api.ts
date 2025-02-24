interface ApiErrorResponse {
  error: string;
  details?: string;
}

interface RegistrationResponse {
  address: string;
}

interface RegistrationCheckResponse {
  isRegistered: boolean;
  address: string;
}

export interface App {
  id: number;
  name: string;
  description?: string;
  owner_address: string;
  created_at: string;
  updated_at: string;
}

interface CreateAppResponse {
  id: number;
  name: string;
  description?: string;
  owner_address: string;
}

// User registration methods
export async function checkUserRegistration(address: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/check/${address}`);
    
    if (!response.ok) {
      const errorData = await response.json() as ApiErrorResponse;
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`);
    }
    
    const data = await response.json() as RegistrationCheckResponse;
    return await Promise.resolve(data.isRegistered);
  } catch (error) {
    console.error('Error checking registration:', error);
    throw error;
  }
}

export async function registerUser(address: string, message: string, signature: string): Promise<RegistrationResponse> {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        message,
        signature,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error || 'Registration failed');
    }
    
    return await Promise.resolve(data as RegistrationResponse);
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

// Apps management methods
export async function getMyApps(address: string): Promise<App[]> {
  if (!address) {
    throw new Error('Wallet address is required');
  }

  try {
    const response = await fetch('/api/my-apps', {
      headers: {
        'x-wallet-address': address,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json() as ApiErrorResponse;
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`);
    }
    
    const data = await response.json() as App[];
    return await Promise.resolve(data);
  } catch (error) {
    console.error('Error fetching apps:', error);
    throw error;
  }
}

export async function createApp(
  address: string,
  name: string,
  description: string | undefined,
  signature: string
): Promise<CreateAppResponse> {
  if (!address) {
    throw new Error('Wallet address is required');
  }

  try {
    const response = await fetch('/api/my-apps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': address,
      },
      body: JSON.stringify({
        name,
        description,
        signature,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error || 'Failed to create app');
    }
    
    return data as CreateAppResponse;
  } catch (error) {
    console.error('Error creating app:', error);
    throw error;
  }
}

export async function deleteApp(address: string, id: number, signature: string): Promise<void> {
  if (!address) {
    throw new Error('Wallet address is required');
  }

  try {
    const response = await fetch(`/api/my-apps/${String(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': address,
      },
      body: JSON.stringify({
        signature,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json() as ApiErrorResponse;
      throw new Error(errorData.error || 'Failed to delete app');
    }
  } catch (error) {
    console.error('Error deleting app:', error);
    throw error;
  }
} 