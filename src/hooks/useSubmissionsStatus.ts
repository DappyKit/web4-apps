import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../redux/hooks'
import { setSubmissionsEnabled, selectSubmissions } from '../redux/reducers/submissionsSlice'
import { getSubmissionsStatus } from '../services/api'

/**
 * Custom hook to manage submissions status
 * @returns Object containing submissions status and loading state
 */
export function useSubmissionsStatus(): { areSubmissionsEnabled: boolean } {
  const dispatch = useAppDispatch()
  const submissionsState = useAppSelector(selectSubmissions)

  useEffect(() => {
    const fetchSubmissionsStatus = async (): Promise<void> => {
      try {
        const { areSubmissionsEnabled } = await getSubmissionsStatus()
        dispatch(setSubmissionsEnabled(areSubmissionsEnabled))
      } catch (error) {
        console.error('Failed to fetch submissions status:', error)
        // Default to enabled on error
        dispatch(setSubmissionsEnabled(true))
      }
    }

    void fetchSubmissionsStatus()
  }, [dispatch])

  return {
    areSubmissionsEnabled: submissionsState.areSubmissionsEnabled,
  }
}
