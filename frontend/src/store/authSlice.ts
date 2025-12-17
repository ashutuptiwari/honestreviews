// src/store/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: true,   // auth state is unknown on first load
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.loading = false; // ✅ auth resolved (logged in)
    },

    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false; // ✅ auth resolved (logged out)
    },

    // explicit semantic alias
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false; // ✅ auth resolved (logged out)
    },
  },
});

export const {
  setCredentials,
  clearCredentials,
  logout,
} = authSlice.actions;

/* ---------- SELECTORS ---------- */

export const selectAuthUser = (state: RootState): User | null =>
  state.auth.user;

export const selectAuthLoading = (state: RootState): boolean =>
  state.auth.loading;

export const selectAuthToken = (state: RootState): string | null =>
  state.auth.token;

export default authSlice.reducer;
