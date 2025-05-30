import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Add custom matchers
expect.extend(matchers)

// Mock window.alert
window.alert = vi.fn()

// Mock the API module to include getSubmissionsStatus
vi.mock('../services/api', () => ({
  getSubmissionsStatus: vi.fn().mockResolvedValue({ areSubmissionsEnabled: true }),
  checkUserRegistration: vi.fn(),
  registerUser: vi.fn(),
  getMyApps: vi.fn(),
  deleteApp: vi.fn(),
  createApp: vi.fn(),
  getAllTemplatesForUser: vi.fn(),
  getMyTemplates: vi.fn(),
  deleteTemplate: vi.fn(),
  createTemplate: vi.fn(),
}))

// Clean up after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
