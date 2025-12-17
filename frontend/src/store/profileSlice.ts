// src/store/profileSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Profile, ProfileUpdatePayload } from '@/types/profiles';
import { fetchProfile as apiFetchProfile, updateProfile as apiUpdateProfile } from '@/services/profileWrapper';
import type { RootState } from '@/store';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updating: boolean;
  updateError: string | null;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
  updating: false,
  updateError: null,
};

/**
 * Fetch current user's personal profile.
 */
export const fetchProfile = createAsyncThunk<Profile, void, { rejectValue: string }>(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await apiFetchProfile();
      return profile;
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

/**
 * Update current user's personal profile.
 */
export const updateProfile = createAsyncThunk<Profile, ProfileUpdatePayload, { rejectValue: string }>(
  'profile/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const updatedProfile = await apiUpdateProfile(payload);
      return updatedProfile;
    } catch (error: any) {
      const message = error?.message || 'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.updating = false;
      state.updateError = null;
    },
    clearUpdateError: (state) => {
      state.updateError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<Profile>) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch profile';
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<Profile>) => {
        state.updating = false;
        state.profile = action.payload;
        state.updateError = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload || 'Failed to update profile';
      });
  },
});

export const { clearProfile, clearUpdateError } = profileSlice.actions;

// Selectors
export const selectProfile = (state: RootState) => state.profile.profile;
export const selectProfileLoading = (state: RootState) => state.profile.loading;
export const selectProfileError = (state: RootState) => state.profile.error;
export const selectProfileUpdating = (state: RootState) => state.profile.updating;
export const selectProfileUpdateError = (state: RootState) => state.profile.updateError;

export default profileSlice.reducer;