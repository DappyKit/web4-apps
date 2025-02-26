import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { AllTheProviders } from './test-utils'

/**
 * Custom render function that wraps component with necessary providers
 * @param ui - Component to render
 * @param options - Additional render options
 * @returns Rendered component with all necessary providers
 */
export const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult => {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  })
}
