// Mock for the OpenAI module
export const mockCreateCompletion = jest.fn()

// Define the OpenAI interface
interface OpenAIOptions {
  apiKey: string
}

// Define the OpenAI class with a constructor that takes an options object
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const OpenAI = jest.fn().mockImplementation((_options: OpenAIOptions) => {
  return {
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  }
})

// Make sure the prototype has the chat property for instanceof checks
OpenAI.prototype.chat = {
  completions: {
    create: mockCreateCompletion,
  },
}

/**
 * Reset the mock function
 * @returns void
 */
export function resetMock(): void {
  mockCreateCompletion.mockReset()
}

/**
 * Helper to set up a successful response
 * @param content - The content to include in the response
 * @returns void
 */
export function mockSuccessResponse(content: string): void {
  mockCreateCompletion.mockImplementation(params => {
    return Promise.resolve({
      choices: [
        {
          message: {
            content,
            role: 'assistant',
          },
          index: 0,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
      id: 'mock-id',
      object: 'chat.completion',
      created: Date.now(),
      model: params.model,
    })
  })
}

/**
 * Helper to set up an error response
 * @param errorMessage - The error message to include
 * @returns void
 */
export function mockErrorResponse(errorMessage: string): void {
  mockCreateCompletion.mockImplementation(() => {
    throw new Error(errorMessage)
  })
}
