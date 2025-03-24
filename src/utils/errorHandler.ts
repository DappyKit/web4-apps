import { GitHubApiError } from '../services/github'
import { GitHubError } from '../../backend/src/routes/github'

interface ErrorWithMessage {
  message: string
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) {
    return maybeError
  }

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    return new Error(String(maybeError))
  }
}

function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message
}

export function handleGitHubApiError(error: unknown): GitHubApiError {
  if (error instanceof GitHubApiError) {
    return error
  }

  if (error instanceof Error) {
    return new GitHubApiError('Failed to fetch user data')
  }

  return new GitHubApiError(getErrorMessage(error))
}

export function handleGitHubError(error: unknown): GitHubError {
  if (error instanceof GitHubError) {
    return error
  }

  if (error instanceof Error) {
    return new GitHubError('Failed to exchange code for token')
  }

  return new GitHubError(getErrorMessage(error))
}

export function assertIsError(error: unknown): asserts error is Error {
  if (!(error instanceof Error)) {
    throw new Error(`Expected an Error instance, got: ${typeof error}`)
  }
}

export function assertIsGitHubApiError(error: unknown): asserts error is GitHubApiError {
  assertIsError(error)
  if (!(error instanceof GitHubApiError)) {
    throw new Error(`Expected a GitHubApiError instance, got: ${error.constructor.name}`)
  }
}

export function assertIsGitHubError(error: unknown): asserts error is GitHubError {
  assertIsError(error)
  if (!(error instanceof GitHubError)) {
    throw new Error(`Expected a GitHubError instance, got: ${error.constructor.name}`)
  }
}
