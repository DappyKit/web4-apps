import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SubmissionsState {
  areSubmissionsEnabled: boolean
}

const initialState: SubmissionsState = {
  areSubmissionsEnabled: true, // Default to enabled
}

export const submissionsSlice = createSlice({
  name: 'submissions',
  initialState,
  reducers: {
    setSubmissionsEnabled: (state, action: PayloadAction<boolean>) => {
      state.areSubmissionsEnabled = action.payload
    },
  },
})

export const { setSubmissionsEnabled } = submissionsSlice.actions

export const selectSubmissions = (state: { submissions: SubmissionsState }): SubmissionsState => state.submissions

export default submissionsSlice.reducer
