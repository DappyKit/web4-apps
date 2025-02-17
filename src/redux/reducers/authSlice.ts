import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export interface AuthState {
  isAuthenticated: boolean
  username: string
  message: string
  signature: string
  nonce: string
  fid: number
}

const initialState: AuthState = {
  isAuthenticated: false,
  username: '',
  message: '',
  signature: '',
  nonce: '',
  fid: 0,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: state => {
      Object.assign(state, initialState);
    },
    setAuthData: (state, action: PayloadAction<AuthState>) => {
      Object.assign(state, action.payload)
    },
  },
})

export const { logout, setAuthData } = authSlice.actions

export const selectAuth = (state: RootState) => state.auth

export default authSlice.reducer
