import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { checkUserRegistration, registerUser } from '../services/api';

const REGISTRATION_MESSAGE = "Web4 Apps Registration";

export function Dashboard() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkRegistrationStatus = useCallback(async () => {
    if (!address) return;
    
    try {
      const registered = await checkUserRegistration(address);
      setIsRegistered(registered);
    } catch (error) {
      console.error('Error checking registration:', error);
      setError('Failed to check registration status');
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      void checkRegistrationStatus();
    }
  }, [address, checkRegistrationStatus]);

  const handleRegister = async () => {
    if (!address || isRegistering) return;

    setIsRegistering(true);
    setError(null);

    try {
      const signature = await signMessageAsync({ message: REGISTRATION_MESSAGE });
      
      await registerUser(address, REGISTRATION_MESSAGE, signature);
      await checkRegistrationStatus();
      alert('Registration successful!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setError(message);
      alert(`Registration failed: ${message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="container py-4">
      <h1>Dashboard</h1>
      
      {!isRegistered && (
        <div className="card mt-4">
          <div className="card-body">
            <h5 className="card-title">Registration Required</h5>
            <p className="card-text">Please register your account to access all features.</p>
            <button
              className="btn btn-primary"
              onClick={() => void handleRegister()}
              disabled={isRegistering}
            >
              {isRegistering ? 'Registering...' : 'Register Now'}
            </button>
            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add your dashboard content here */}
    </div>
  );
} 