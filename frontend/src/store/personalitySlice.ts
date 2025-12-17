// src/store/slices/personalitySlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import {
  Personality,
  PersonalityCreate,
  PersonalityUpdate,
  FetchPersonalitiesParams,
} from '@/types/personalities';
import * as personalityApi from '@/services/personalitiesWrapper';

/* -------------------------------------------------------------------------- */
/*                                  State                                     */
/* -------------------------------------------------------------------------- */

interface PersonalitiesState {
  // List state (for infinite scroll)
  personalities: Personality[];
  loading: boolean;
  error: string | null;
  
  // Pagination state
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  
  // Sorting & search
  sort: string;              // NEW: created_at, average_review, total_reviews, name
  order: 'asc' | 'desc';     // NEW
  searchQuery: string;       // NEW
  
  // Current personality (detail view)
  currentPersonality: Personality | null;
  
  // Current org context
  currentOrgSlug: string | null;  // NEW: track which org we're viewing
}

const initialState: PersonalitiesState = {
  personalities: [],
  loading: false,
  error: null,
  
  currentPage: 1,
  pageSize: 25,
  hasMore: true,
  
  sort: 'created_at',
  order: 'desc',
  searchQuery: '',
  
  currentPersonality: null,
  currentOrgSlug: null,
};

/* -------------------------------------------------------------------------- */
/*                               Async Thunks                                 */
/* -------------------------------------------------------------------------- */

export const fetchPersonalities = createAsyncThunk<
  { data: Personality[]; page: number },
  { 
    orgSlug: string; 
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  },
  { rejectValue: string; state: RootState }
>(
  'personalities/fetchPersonalities',
  async ({ orgSlug, page, limit, search, sort, order }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      
      // Use provided params or fall back to state
      const finalPage = page ?? state.personalities.currentPage;
      const finalLimit = limit ?? state.personalities.pageSize;
      const finalSearch = search ?? state.personalities.searchQuery;
      const finalSort = sort ?? state.personalities.sort;
      const finalOrder = order ?? state.personalities.order;
      
      const data = await personalityApi.listPersonalities(orgSlug, {
        page: finalPage,
        limit: finalLimit,
        search: finalSearch,
        sort: finalSort,
        order: finalOrder,
      });
      
      return { data, page: finalPage };
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to fetch personalities'
      );
    }
  }
);

export const fetchPersonalityBySlug = createAsyncThunk<
  Personality,
  { orgSlug: string; personalitySlug: string },
  { rejectValue: string }
>(
  'personalities/fetchPersonalityBySlug',
  async ({ orgSlug, personalitySlug }, { rejectWithValue }) => {
    try {
      return await personalityApi.getPersonality(orgSlug, personalitySlug);
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to fetch personality'
      );
    }
  }
);

export const createPersonality = createAsyncThunk<
  Personality,
  { orgSlug: string; payload: PersonalityCreate },
  { rejectValue: string }
>(
  'personalities/createPersonality',
  async ({ orgSlug, payload }, { rejectWithValue }) => {
    try {
      return await personalityApi.createPersonality(orgSlug, payload);
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to create personality'
      );
    }
  }
);

export const updatePersonality = createAsyncThunk<
  Personality,
  {
    orgSlug: string;
    personalitySlug: string;
    payload: PersonalityUpdate;
  },
  { rejectValue: string }
>(
  'personalities/updatePersonality',
  async ({ orgSlug, personalitySlug, payload }, { rejectWithValue }) => {
    try {
      return await personalityApi.updatePersonality(
        orgSlug,
        personalitySlug,
        payload
      );
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to update personality'
      );
    }
  }
);

export const deletePersonality = createAsyncThunk<
  string,
  { orgSlug: string; personalitySlug: string },
  { rejectValue: string }
>(
  'personalities/deletePersonality',
  async ({ orgSlug, personalitySlug }, { rejectWithValue }) => {
    try {
      await personalityApi.deletePersonality(orgSlug, personalitySlug);
      return personalitySlug;
    } catch (error: any) {
      return rejectWithValue(
        error?.message || 'Failed to delete personality'
      );
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                                   Slice                                    */
/* -------------------------------------------------------------------------- */

const personalitySlice = createSlice({
  name: 'personalities',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    
    clearCurrentPersonality(state) {
      state.currentPersonality = null;
    },
    
    // NEW: Set search query and reset list
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.currentPage = 1;
      state.hasMore = true;
      state.personalities = [];
    },
    
    // NEW: Set sorting and reset list
    setSorting(state, action: PayloadAction<{ sort: string; order: 'asc' | 'desc' }>) {
      state.sort = action.payload.sort;
      state.order = action.payload.order;
      state.currentPage = 1;
      state.hasMore = true;
      state.personalities = [];
    },
    
    // NEW: Reset list when changing org
    setCurrentOrg(state, action: PayloadAction<string>) {
      if (state.currentOrgSlug !== action.payload) {
        state.currentOrgSlug = action.payload;
        state.personalities = [];
        state.currentPage = 1;
        state.hasMore = true;
        state.searchQuery = '';
        state.sort = 'created_at';
        state.order = 'desc';
      }
    },
    
    // NEW: Reset entire list state
    resetPersonalityList(state) {
      state.personalities = [];
      state.currentPage = 1;
      state.hasMore = true;
      state.error = null;
    },
  },
  
  extraReducers: (builder) => {
    builder

      /* -------------------------- Fetch List -------------------------- */
      .addCase(fetchPersonalities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchPersonalities.fulfilled,
        (state, action: PayloadAction<{ data: Personality[]; page: number }>) => {
          state.loading = false;
          const { data, page } = action.payload;
          
          state.currentPage = page;
          
          if (page === 1) {
            // Initial load or refresh
            state.personalities = data;
          } else {
            // Infinite scroll: append
            state.personalities.push(...data);
          }
          
          // Check if there are more results
          state.hasMore = data.length === state.pageSize;
        }
      )
      .addCase(fetchPersonalities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch personalities';
      })

      /* ------------------------ Fetch Single --------------------------- */
      .addCase(fetchPersonalityBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchPersonalityBySlug.fulfilled,
        (state, action: PayloadAction<Personality>) => {
          state.loading = false;
          state.currentPersonality = action.payload;
        }
      )
      .addCase(fetchPersonalityBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch personality';
      })

      /* --------------------------- Create ------------------------------ */
      .addCase(createPersonality.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createPersonality.fulfilled,
        (state, action: PayloadAction<Personality>) => {
          state.loading = false;
          state.personalities.unshift(action.payload);
        }
      )
      .addCase(createPersonality.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to create personality';
      })

      /* --------------------------- Update ------------------------------ */
      .addCase(updatePersonality.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updatePersonality.fulfilled,
        (state, action: PayloadAction<Personality>) => {
          state.loading = false;

          const index = state.personalities.findIndex(
            (p) => p.id === action.payload.id
          );
          if (index !== -1) {
            state.personalities[index] = action.payload;
          }

          if (state.currentPersonality?.id === action.payload.id) {
            state.currentPersonality = action.payload;
          }
        }
      )
      .addCase(updatePersonality.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to update personality';
      })

      /* --------------------------- Delete ------------------------------ */
      .addCase(deletePersonality.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deletePersonality.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.personalities = state.personalities.filter(
            (p) => p.slug !== action.payload
          );

          if (state.currentPersonality?.slug === action.payload) {
            state.currentPersonality = null;
          }
        }
      )
      .addCase(deletePersonality.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to delete personality';
      });
  },
});

/* -------------------------------------------------------------------------- */
/*                                 Selectors                                  */
/* -------------------------------------------------------------------------- */

export const selectPersonalities = (state: RootState) =>
  state.personalities.personalities;

export const selectCurrentPersonality = (state: RootState) =>
  state.personalities.currentPersonality;

export const selectPersonalitiesLoading = (state: RootState) =>
  state.personalities.loading;

export const selectPersonalitiesError = (state: RootState) =>
  state.personalities.error;

export const selectHasMorePersonalities = (state: RootState) =>
  state.personalities.hasMore;

export const selectPersonalitiesPage = (state: RootState) =>
  state.personalities.currentPage;

export const selectPersonalitiesSort = (state: RootState) =>
  state.personalities.sort;

export const selectPersonalitiesOrder = (state: RootState) =>
  state.personalities.order;

export const selectPersonalitiesSearchQuery = (state: RootState) =>
  state.personalities.searchQuery;

export const {
  clearError,
  clearCurrentPersonality,
  setSearchQuery,
  setSorting,
  setCurrentOrg,
  resetPersonalityList,
} = personalitySlice.actions;

export default personalitySlice.reducer;
