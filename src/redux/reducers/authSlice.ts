import { createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export interface AuthState {
  isAuthenticated: boolean
  address: string
  username: string
  message: string
  signature: string
  nonce: string
  fid: number
}

const initialState: AuthState = {
  isAuthenticated: false,
  address: '',
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
    login: (state, action) => {
      state.isAuthenticated = true
      state.address = action.payload.address
    },
  },
})

export const { logout, login } = authSlice.actions

export const selectAuth = (state: RootState) => state.auth

export default authSlice.reducer
