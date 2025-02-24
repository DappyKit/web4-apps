import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { createApp } from '../services/api';

// Constants matching backend limitations
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;

interface FormData {
  name: string;
  description: string;
}

interface FormErrors {
  name?: string;
  description?: string;
}

export function MyApps() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedName) {
      newErrors.name = 'App name is required';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'App name must be at least 3 characters';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      newErrors.name = `App name must be less than ${String(MAX_NAME_LENGTH)} characters`;
    }

    if (trimmedDescription && trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${String(MAX_DESCRIPTION_LENGTH)} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);

    try {
      const signature = await signMessageAsync({
        message: `Create app: ${formData.name.trim()}`
      });

      await createApp(
        address as string,
        formData.name.trim(),
        formData.description.trim() || undefined,
        signature
      );

      setSuccess('App created successfully!');
      setFormData({ name: '', description: '' });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create app');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: removed, ...rest } = prev;
        return rest;
      });
    }
  };

  // Add character count display
  const nameCharCount = formData.name.trim().length;
  const descriptionCharCount = formData.description.trim().length;

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">My Apps</h1>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Create New App</h5>
              
              {error && (
                <Alert variant="danger" onClose={() => { setError(null); }} dismissible>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" onClose={() => { setSuccess(null); }} dismissible>
                  {success}
                </Alert>
              )}

              <Form onSubmit={(e) => { void handleSubmit(e); }}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="name">
                    App Name
                    <span className="text-muted ms-2">
                      ({nameCharCount}/{MAX_NAME_LENGTH})
                    </span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    isInvalid={!!errors.name}
                    disabled={isCreating}
                    maxLength={MAX_NAME_LENGTH}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Name must be between 3 and {MAX_NAME_LENGTH} characters
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="description">
                    Description
                    <span className="text-muted ms-2">
                      ({descriptionCharCount}/{MAX_DESCRIPTION_LENGTH})
                    </span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    disabled={isCreating}
                    isInvalid={!!errors.description}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.description}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Maximum {MAX_DESCRIPTION_LENGTH} characters
                  </Form.Text>
                </Form.Group>

                <Button 
                  type="submit" 
                  variant="primary"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Creating...
                    </>
                  ) : (
                    'Create App'
                  )}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 