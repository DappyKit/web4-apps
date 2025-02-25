import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { createTemplate, getMyTemplates, deleteTemplate } from '../services/api';
import type { Template } from '../services/api';
import { TemplateList } from '../components/TemplateList';

// Constants matching backend limitations
const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_JSON_LENGTH = 10000;

interface FormData {
  title: string;
  description: string;
  url: string;
  jsonData: string;
}

interface FormErrors {
  [key: string]: string | undefined;
  title?: string;
  description?: string;
  url?: string;
  jsonData?: string;
}

export function MyTemplates(): React.JSX.Element {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    url: '',
    jsonData: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const myTemplates = await getMyTemplates(address);
      setTemplates(myTemplates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load templates';
      setError(errorMessage);
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadTemplates().catch(console.error);
  }, [loadTemplates]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedUrl = formData.url.trim();
    const trimmedJsonData = formData.jsonData.trim();

    if (!trimmedTitle) {
      newErrors.title = 'Template title is required';
    } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be less than ${String(MAX_TITLE_LENGTH)} characters`;
    }

    if (trimmedDescription && trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${String(MAX_DESCRIPTION_LENGTH)} characters`;
    }

    if (!trimmedUrl) {
      newErrors.url = 'Template URL is required';
    } else {
      try {
        new URL(trimmedUrl);
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (!trimmedJsonData) {
      newErrors.jsonData = 'Template JSON data is required';
    } else {
      try {
        JSON.parse(trimmedJsonData);
        if (trimmedJsonData.length > MAX_JSON_LENGTH) {
          newErrors.jsonData = `JSON data must be less than ${String(MAX_JSON_LENGTH)} characters`;
        }
      } catch {
        newErrors.jsonData = 'Invalid JSON format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);

    try {
      const signature = await signMessageAsync({
        message: `Create template: ${formData.title.trim()}`
      });

      await createTemplate(
        address as string,
        formData.title.trim(),
        formData.description.trim() || undefined,
        formData.url.trim(),
        formData.jsonData.trim(),
        signature
      );

      setSuccess('Template created successfully!');
      setFormData({ title: '', description: '', url: '', jsonData: '' });
      await loadTemplates();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setIsCreating(false);
    }
  }, [address, formData, loadTemplates, signMessageAsync, validateForm]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit(e);
  }, [handleSubmit]);

  const handleDeleteTemplate = useCallback(async (templateId: number) => {
    if (!address || isDeleting !== null) return;

    setIsDeleting(templateId);
    setError(null);

    try {
      const message = `Delete template #${String(templateId)}`;
      const signature = await signMessageAsync({ message });

      await deleteTemplate(address, templateId, signature);
      await loadTemplates();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete template';
      setError(errorMessage);
      console.error('Error deleting template:', error);
    } finally {
      setIsDeleting(null);
    }
  }, [address, isDeleting, loadTemplates, signMessageAsync]);

  const handleTemplateDelete = useCallback((templateId: number) => {
    void handleDeleteTemplate(templateId);
  }, [handleDeleteTemplate]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [errors]);

  // Add character count display
  const titleCharCount = formData.title.trim().length;
  const descriptionCharCount = formData.description.trim().length;
  const jsonCharCount = formData.jsonData.trim().length;

  const handleErrorClose = useCallback(() => {
    setError(null);
  }, []);

  const handleSuccessClose = useCallback(() => {
    setSuccess(null);
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">My Templates</h1>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Create New Template</h5>

              {error && (
                <Alert variant="danger" onClose={handleErrorClose} dismissible>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" onClose={handleSuccessClose} dismissible>
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleFormSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="title">
                    Template Title
                    <span className="text-muted ms-2">
                      ({titleCharCount}/{MAX_TITLE_LENGTH})
                    </span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    isInvalid={!!errors.title}
                    disabled={isCreating}
                    maxLength={MAX_TITLE_LENGTH}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.title}
                  </Form.Control.Feedback>
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

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="url">Template URL</Form.Label>
                  <Form.Control
                    type="url"
                    id="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    isInvalid={!!errors.url}
                    disabled={isCreating}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.url}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="jsonData">
                    JSON Data
                    <span className="text-muted ms-2">
                      ({jsonCharCount}/{MAX_JSON_LENGTH})
                    </span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    id="jsonData"
                    name="jsonData"
                    value={formData.jsonData}
                    onChange={handleChange}
                    rows={5}
                    disabled={isCreating}
                    isInvalid={!!errors.jsonData}
                    maxLength={MAX_JSON_LENGTH}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.jsonData}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Enter valid JSON data, maximum {MAX_JSON_LENGTH} characters
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
                    'Create Template'
                  )}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h2>Your Templates</h2>
        <TemplateList
          templates={templates}
          isLoading={isLoading}
          onDeleteTemplate={handleTemplateDelete}
          isDeleting={isDeleting}
          showEmptyMessage="You don't have any templates yet. Create one using the form above!"
        />
      </div>
    </div>
  );
} 