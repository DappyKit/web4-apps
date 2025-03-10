/**
 * Safely handles a promise by catching any errors and logging them
 * This is useful for promises that we don't need to await but still want to handle errors
 * @param promise - The promise to handle
 * @param errorHandler - Optional custom error handler
 */
export function handlePromiseSafely<T>(promise: Promise<T>, errorHandler?: (error: unknown) => void): void {
  void promise.catch((error: unknown) => {
    if (errorHandler) {
      errorHandler(error)
    } else {
      console.error('Unhandled promise error:', error)
    }
  })
}
