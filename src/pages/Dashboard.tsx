import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { checkUserRegistration, registerUser, getMyApps, createApp, deleteApp } from '../services/api';
import type { App } from '../services/api';

const REGISTRATION_MESSAGE = "Web4 Apps Registration";

function generateRandomAppName(): string {
  const adjectives = ['Amazing', 'Brilliant', 'Creative', 'Dynamic', 'Elegant'];
  const nouns = ['App', 'Project', 'Solution', 'Platform', 'System'];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
}

export function Dashboard() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

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

  const loadApps = useCallback(async () => {
    if (!isRegistered || !address) return;
    
    setIsLoading(true);
    try {
      const myApps = await getMyApps(address);
      setApps(myApps);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load apps';
      setError(errorMessage);
      console.error('Error loading apps:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isRegistered, address]);

  useEffect(() => {
    if (address) {
      checkRegistrationStatus().catch(console.error);
    }
  }, [address, checkRegistrationStatus]);

  useEffect(() => {
    loadApps().catch(console.error);
  }, [loadApps]);

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
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      alert(`Registration failed: ${errorMessage}`);
      console.error('Error during registration:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCreateApp = async () => {
    if (!address || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const name = generateRandomAppName();
      const description = 'A sample application';
      const message = `Create app: ${name}`;
      const signature = await signMessageAsync({ message });

      await createApp(address, name, description, signature);
      await loadApps();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create app';
      setError(errorMessage);
      alert(`Failed to create app: ${errorMessage}`);
      console.error('Error creating app:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteApp = async (appId: number) => {
    if (!address || isDeleting !== null) return;

    setIsDeleting(appId);
    setError(null);

    try {
      const message = `Delete application #${String(appId)}`;
      const signature = await signMessageAsync({ message });

      await deleteApp(address, appId, signature);
      await loadApps();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete app';
      setError(errorMessage);
      alert(`Failed to delete app: ${errorMessage}`);
      console.error('Error deleting app:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const onRegisterClick = () => {
    handleRegister().catch(console.error);
  };

  const onCreateAppClick = () => {
    handleCreateApp().catch(console.error);
  };

  const onDeleteAppClick = (appId: number) => {
    handleDeleteApp(appId).catch(console.error);
  };

  const renderDeleteButton = (appId: number) => {
    return (
      <button
        className="btn btn-danger"
        onClick={() => {
          onDeleteAppClick(appId);
        }}
        disabled={isDeleting === appId}
      >
        {isDeleting === appId ? 'Deleting...' : 'Delete'}
      </button>
    );
  };

  const renderAppCard = (app: App) => {
    const createdDate = new Date(app.created_at);
    const appId = Number(app.id);
    return (
      <div key={appId} className="col">
        <div className="card h-100">
          <div className="card-body">
            <h5 className="card-title">{app.name}</h5>
            {app.description && (
              <p className="card-text">{app.description}</p>
            )}
            <p className="card-text">
              <small className="text-muted">
                Created: {createdDate.toLocaleDateString()}
              </small>
            </p>
          </div>
          <div className="card-footer">
            {renderDeleteButton(appId)}
          </div>
        </div>
      </div>
    );
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
              onClick={onRegisterClick}
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

      {isRegistered && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>My Apps</h2>
            <button
              className="btn btn-primary"
              onClick={onCreateAppClick}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Random App'}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : apps.length === 0 ? (
            <div className="alert alert-info">
              You don&apos;t have any apps yet. Create one to get started!
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {apps.map(renderAppCard)}
            </div>
          )}

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
} 