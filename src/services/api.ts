interface ApiErrorResponse {
  error: string
  details?: string
}

interface RegistrationResponse {
  address: string
}

interface RegistrationCheckResponse {
  isRegistered: boolean
  address: string
}

export interface App {
  id: number
  name: string
  description?: string
  owner_address: string
  created_at: string
  updated_at: string
  template_id: number
  json_data?: string
  moderated: boolean
}

interface CreateAppResponse {
  id: number
  name: string
  description?: string
  owner_address: string
  template_id: number
  json_data?: string
}

export interface Template {
  id: number
  title: string
  description?: string
  url: string
  json_data: string
  owner_address: string
  created_at: string
  updated_at: string
}

export interface UserWithAppCount {
  trimmed_address: string
  app_count: number
  is_user?: boolean
}

export interface UserRecord {
  trimmed_address: string
  app_count: number
  is_user: boolean
  rank: number
}

export interface TopCreatorsResponse {
  users: UserWithAppCount[]
  user_record: UserRecord | null
}

// User registration methods
export async function checkUserRegistration(address: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/check/${address}`)

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as RegistrationCheckResponse
    return await Promise.resolve(data.isRegistered)
  } catch (error) {
    console.error('Error checking registration:', error)
    throw error
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
    })

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as ApiErrorResponse
      throw new Error(errorData.error || 'Registration failed')
    }

    return await Promise.resolve(data as RegistrationResponse)
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

// Apps management methods
export async function getMyApps(address: string): Promise<App[]> {
  if (!address) {
    throw new Error('Wallet address is required')
  }

  try {
    const response = await fetch('/api/my-apps', {
      headers: {
        'x-wallet-address': address,
      },
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as App[]
    return await Promise.resolve(data)
  } catch (error) {
    console.error('Error fetching apps:', error)
    throw error
  }
}

export async function createApp(
  address: string,
  name: string,
  description: string | undefined,
  signature: string,
  templateId: number,
  jsonData: string,
): Promise<CreateAppResponse> {
  if (!address) {
    throw new Error('Wallet address is required')
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
        template_id: templateId,
        json_data: jsonData,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as ApiErrorResponse
      throw new Error(errorData.error || 'Failed to create app')
    }

    return data as CreateAppResponse
  } catch (error) {
    console.error('Error creating app:', error)
    throw error
  }
}

export async function deleteApp(address: string, id: number, signature: string): Promise<void> {
  if (!address) {
    throw new Error('Wallet address is required')
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
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || 'Failed to delete app')
    }
  } catch (error) {
    console.error('Error deleting app:', error)
    throw error
  }
}

// Template management methods
export async function getMyTemplates(address: string): Promise<Template[]> {
  if (!address) {
    throw new Error('Wallet address is required')
  }

  try {
    const response = await fetch(`/api/templates/my?address=${address}`, {
      headers: {
        'x-wallet-address': address,
      },
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as Template[]
    return await Promise.resolve(data)
  } catch (error) {
    console.error('Error fetching templates:', error)
    throw error
  }
}

export async function createTemplate(
  address: string,
  title: string,
  description: string | undefined,
  url: string,
  jsonData: string,
  signature: string,
): Promise<Template> {
  if (!address) {
    throw new Error('Wallet address is required')
  }

  try {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': address,
      },
      body: JSON.stringify({
        title,
        description,
        url,
        json_data: jsonData,
        signature,
        address,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as ApiErrorResponse
      throw new Error(errorData.error || 'Failed to create template')
    }

    return data as Template
  } catch (error) {
    console.error('Error creating template:', error)
    throw error
  }
}

export async function deleteTemplate(address: string, id: number, signature: string): Promise<void> {
  if (!address) {
    throw new Error('Wallet address is required')
  }

  try {
    const response = await fetch(`/api/templates/${String(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': address,
      },
      body: JSON.stringify({
        signature,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || 'Failed to delete template')
    }
  } catch (error) {
    console.error('Error deleting template:', error)
    throw error
  }
}

/**
 * Pagination response interface for getAllApps
 */
export interface PaginatedAppsResponse {
  data: App[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Get all moderated apps with pagination
 * @param {number} page - The page number to retrieve
 * @param {number} limit - The number of items per page
 * @returns {Promise<PaginatedAppsResponse>} The paginated apps data
 */
export async function getAllApps(page = 1, limit = 12): Promise<PaginatedAppsResponse> {
  try {
    const response = await fetch(`/api/apps?page=${String(page)}&limit=${String(limit)}`)

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as PaginatedAppsResponse
    return data
  } catch (error) {
    console.error('Error fetching all apps:', error)
    throw error
  }
}

/**
 * Get app by ID
 * @param {number} id - The ID of the app to retrieve
 * @returns {Promise<App>} The app data
 */
export async function getAppById(id: number): Promise<App> {
  try {
    const response = await fetch(`/api/apps/${String(id)}`)

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as App
    return data
  } catch (error) {
    console.error('Error fetching app:', error)
    throw error
  }
}

/**
 * Fetches a single template by its ID
 * @param {number} id - The ID of the template to fetch
 * @returns {Promise<Template>} The template data
 * @throws {Error} If the template is not found or there's an error fetching it
 */
export async function getTemplateById(id: number): Promise<Template> {
  try {
    const response = await fetch(`/api/templates/${String(id)}`)

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as Template
    return await Promise.resolve(data)
  } catch (error) {
    console.error('Error fetching template:', error)
    throw error
  }
}

/**
 * Pagination response interface for getAllTemplates
 */
export interface PaginatedTemplatesResponse {
  data: Template[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Get all moderated templates with pagination
 * @param {number} page - The page number to retrieve
 * @param {number} limit - The number of items per page
 * @returns {Promise<PaginatedTemplatesResponse>} The paginated templates data
 */
export async function getAllTemplates(page = 1, limit = 12): Promise<PaginatedTemplatesResponse> {
  try {
    const response = await fetch(`/api/templates?page=${String(page)}&limit=${String(limit)}`)

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    const data = (await response.json()) as PaginatedTemplatesResponse
    return data
  } catch (error) {
    console.error('Error fetching all templates:', error)
    throw error
  }
}

/**
 * Interface for AI prompt response from the backend
 */
interface AiPromptApiResponse {
  success: boolean
  data?: {
    result: Record<string, unknown>
  }
  error?: string
}

/**
 * Generates template data using AI
 * @param templateId - The ID of the template to fill with AI-generated data
 * @param prompt - User instructions for AI generation
 * @returns Promise with the AI-generated JSON data for the template
 */
export async function generateTemplateDataWithAI(templateId: number, prompt: string): Promise<string> {
  if (!templateId) {
    throw new Error('Template ID is required')
  }

  if (!prompt) {
    throw new Error('Prompt is required')
  }

  try {
    const response = await fetch('/api/ai/process-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId,
        prompt,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as ApiErrorResponse
      throw new Error(errorData.error || `HTTP error! status: ${String(response.status)}`)
    }

    // Parse the AI response
    const data = (await response.json()) as AiPromptApiResponse
    if (!data.success) {
      const errorMessage = data.error ?? 'AI processing failed'
      throw new Error(errorMessage)
    }

    // Get the result data and convert to string
    return JSON.stringify(data.data?.result ?? {})
  } catch (error) {
    console.error('Error generating AI template data:', error)
    throw error
  }
}

/**
 * Fetches users with app counts, limited to users who have created at least one app
 * Returns maximum 100 users sorted by app count in descending order
 *
 * @param {string} [address] - Optional wallet address to highlight user's position
 * @returns {Promise<TopCreatorsResponse>} Object with users array and optional user record
 */
export async function getUsersWithAppCounts(address?: string): Promise<TopCreatorsResponse> {
  try {
    const url = address ? `/api/with-app-counts?address=${address}` : '/api/with-app-counts'
    const response = await fetch(url)

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json()
      throw new Error(errorData.error || 'Failed to fetch users with app counts')
    }

    const data = await response.json()
    return data as TopCreatorsResponse
  } catch (error) {
    console.error('Error fetching users with app counts:', error)
    throw error
  }
}
