import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit'
import { authSlice } from './reducers/authSlice'
import { submissionsSlice } from './reducers/submissionsSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    submissions: submissionsSlice.reducer,
  },
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>
