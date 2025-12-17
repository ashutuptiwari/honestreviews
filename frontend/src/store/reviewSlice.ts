// ============================================================
// FILE: src/store/reviewSlice.ts
// ============================================================

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type {
  Review,
  ReviewListItem,
  ReviewStats,
  CreateReviewPayload,
  UpdateReviewPayload,
  ReviewsListParams,
} from '@/types/reviews';
import * as reviewsApi from '@/services/reviewWrapper';

// ============================================================================
// State Shape
// ============================================================================

interface ReviewsState {
  // Normalized reviews by ID
  byId: Record<string, Review>;
  
  // Reviews grouped by personality ID (cursor-based pagination)
  byPersonality: Record<string, {
    reviewIds: string[];
    nextCursor: string | null;
    stats: ReviewStats | null;
    loading: boolean;
    error: string | null;
    // NEW: Track current filters/sort for this personality
    currentSort?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc';
    ratingMin?: number;
    ratingMax?: number;
  }>;
  
  // UI states
  creating: boolean;
  createError: string | null;
  
  updating: Record<string, boolean>;
  updateErrors: Record<string, string | null>;
  
  deleting: Record<string, boolean>;
  deleteErrors: Record<string, string | null>;
}

const initialState: ReviewsState = {
  byId: {},
  byPersonality: {},
  creating: false,
  createError: null,
  updating: {},
  updateErrors: {},
  deleting: {},
  deleteErrors: {},
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetch reviews for a personality (cursor-based pagination)
 */
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async (
    {
      orgSlug,
      personalitySlug,
      personalityId,
      params,
    }: {
      orgSlug: string;
      personalitySlug: string;
      personalityId: string;
      params?: ReviewsListParams;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await reviewsApi.listReviews(orgSlug, personalitySlug, params);
      return {
        personalityId,
        items: response.items,
        nextCursor: response.next_cursor,
        stats: response.stats,
        append: !!params?.cursor,
        sort: params?.sort,
        ratingMin: params?.rating_min,
        ratingMax: params?.rating_max,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch reviews');
    }
  }
);

/**
 * Fetch a single review
 * Note: Backend doesn't have this endpoint yet
 */
export const fetchSingleReview = createAsyncThunk(
  'reviews/fetchSingleReview',
  async (
    {
      orgSlug,
      personalitySlug,
      reviewId,
    }: {
      orgSlug: string;
      personalitySlug: string;
      reviewId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const review = await reviewsApi.getReview(orgSlug, personalitySlug, reviewId);
      return review;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch review');
    }
  }
);

/**
 * Create a review
 */
export const createReview = createAsyncThunk(
  'reviews/createReview',
  async (
    {
      orgSlug,
      personalitySlug,
      personalityId,
      payload,
    }: {
      orgSlug: string;
      personalitySlug: string;
      personalityId: string;
      payload: CreateReviewPayload;
    },
    { rejectWithValue }
  ) => {
    try {
      const review = await reviewsApi.createReview(orgSlug, personalitySlug, payload);
      return { review, personalityId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create review');
    }
  }
);

/**
 * Update a review
 */
export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async (
    {
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: UpdateReviewPayload;
    },
    { rejectWithValue }
  ) => {
    try {
      const review = await reviewsApi.updateReview(reviewId, payload);
      return review;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update review');
    }
  }
);

/**
 * Delete a review
 */
export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (
    {
      reviewId,
      personalityId,
    }: {
      reviewId: string;
      personalityId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await reviewsApi.deleteReview(reviewId);
      return { reviewId, personalityId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete review');
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearCreateError: (state) => {
      state.createError = null;
    },
    clearUpdateError: (state, action: PayloadAction<string>) => {
      delete state.updateErrors[action.payload];
    },
    clearDeleteError: (state, action: PayloadAction<string>) => {
      delete state.deleteErrors[action.payload];
    },
    resetPersonalityReviews: (state, action: PayloadAction<string>) => {
      const personalityId = action.payload;
      if (state.byPersonality[personalityId]) {
        state.byPersonality[personalityId].reviewIds = [];
        state.byPersonality[personalityId].nextCursor = null;
        state.byPersonality[personalityId].error = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch reviews
    builder.addCase(fetchReviews.pending, (state, action) => {
      const personalityId = action.meta.arg.personalityId;
      const isAppend = !!action.meta.arg.params?.cursor;
      
      if (!state.byPersonality[personalityId]) {
        state.byPersonality[personalityId] = {
          reviewIds: [],
          nextCursor: null,
          stats: null,
          loading: true,
          error: null,
        };
      } else if (!isAppend) {
        state.byPersonality[personalityId].loading = true;
        state.byPersonality[personalityId].error = null;
      }
    });

    builder.addCase(fetchReviews.fulfilled, (state, action) => {
      const { personalityId, items, nextCursor, stats, append, sort, ratingMin, ratingMax } = action.payload;
      
      items.forEach((item) => {
        if (!state.byId[item.id]) {
          state.byId[item.id] = {
            id: item.id,
            title: item.title,
            body: item.snippet,
            rating: item.rating,
            author: item.author,
            created_at: item.created_at,
            updated_at: item.created_at,
            personality: null as any,
          };
        }
      });

      const reviewIds = items.map((item) => item.id);

      if (!state.byPersonality[personalityId]) {
        state.byPersonality[personalityId] = {
          reviewIds: [],
          nextCursor: null,
          stats: null,
          loading: false,
          error: null,
        };
      }

      if (append) {
        state.byPersonality[personalityId].reviewIds.push(...reviewIds);
      } else {
        state.byPersonality[personalityId].reviewIds = reviewIds;
      }

      state.byPersonality[personalityId].nextCursor = nextCursor;
      state.byPersonality[personalityId].stats = stats;
      state.byPersonality[personalityId].loading = false;
      state.byPersonality[personalityId].currentSort = sort;
      state.byPersonality[personalityId].ratingMin = ratingMin;
      state.byPersonality[personalityId].ratingMax = ratingMax;
    });

    builder.addCase(fetchReviews.rejected, (state, action) => {
      const personalityId = action.meta.arg.personalityId;
      if (state.byPersonality[personalityId]) {
        state.byPersonality[personalityId].loading = false;
        state.byPersonality[personalityId].error = action.payload as string;
      }
    });

    builder.addCase(fetchSingleReview.fulfilled, (state, action) => {
      const review = action.payload;
      state.byId[review.id] = review;
    });

    builder.addCase(createReview.pending, (state) => {
      state.creating = true;
      state.createError = null;
    });

    builder.addCase(createReview.fulfilled, (state, action) => {
      const { review, personalityId } = action.payload;
      
      state.byId[review.id] = review;
      
      if (state.byPersonality[personalityId]) {
        state.byPersonality[personalityId].reviewIds.unshift(review.id);
        
        if (state.byPersonality[personalityId].stats) {
          const stats = state.byPersonality[personalityId].stats!;
          const newTotal = stats.total_reviews + 1;
          const newAverage = ((stats.average_review * stats.total_reviews) + review.rating) / newTotal;
          
          state.byPersonality[personalityId].stats = {
            ...stats,
            total_reviews: newTotal,
            average_review: Math.round(newAverage * 100) / 100,
          };
        }
      }
      
      state.creating = false;
    });

    builder.addCase(createReview.rejected, (state, action) => {
      state.creating = false;
      state.createError = action.payload as string;
    });

    builder.addCase(updateReview.pending, (state, action) => {
      const reviewId = action.meta.arg.reviewId;
      state.updating[reviewId] = true;
      delete state.updateErrors[reviewId];
    });

    builder.addCase(updateReview.fulfilled, (state, action) => {
      const review = action.payload;
      state.byId[review.id] = review;
      delete state.updating[review.id];
    });

    builder.addCase(updateReview.rejected, (state, action) => {
      const reviewId = action.meta.arg.reviewId;
      state.updating[reviewId] = false;
      state.updateErrors[reviewId] = action.payload as string;
    });

    builder.addCase(deleteReview.pending, (state, action) => {
      const reviewId = action.meta.arg.reviewId;
      state.deleting[reviewId] = true;
      delete state.deleteErrors[reviewId];
    });

    builder.addCase(deleteReview.fulfilled, (state, action) => {
      const { reviewId, personalityId } = action.payload;
      
      const review = state.byId[reviewId];
      delete state.byId[reviewId];
      
      if (state.byPersonality[personalityId]) {
        state.byPersonality[personalityId].reviewIds = state.byPersonality[personalityId].reviewIds.filter((id) => id !== reviewId);
        
        if (state.byPersonality[personalityId].stats && review) {
          const stats = state.byPersonality[personalityId].stats!;
          const newTotal = Math.max(0, stats.total_reviews - 1);
          const newAverage = newTotal > 0 ? ((stats.average_review * stats.total_reviews) - review.rating) / newTotal : 0;
          
          state.byPersonality[personalityId].stats = {
            ...stats,
            total_reviews: newTotal,
            average_review: Math.round(newAverage * 100) / 100,
          };
        }
      }
      
      delete state.deleting[reviewId];
    });

    builder.addCase(deleteReview.rejected, (state, action) => {
      const reviewId = action.meta.arg.reviewId;
      state.deleting[reviewId] = false;
      state.deleteErrors[reviewId] = action.payload as string;
    });
  },
});

// ============================================================================
// Selectors
// ============================================================================

export const selectReviewById = (state: RootState, reviewId: string) =>
  state.reviews.byId[reviewId];

export const selectPersonalityReviews = (state: RootState, personalityId: string) =>
  state.reviews.byPersonality[personalityId];

export const selectPersonalityReviewsList = createSelector(
  [
    (state: RootState) => state.reviews.byId,
    (state: RootState, personalityId: string) =>
      // Return undefined when the personality entry does not exist in state.
      // Avoid returning a new array literal here (e.g. `|| []`) because that
      // creates a new reference on every call and defeats memoization.
      state.reviews.byPersonality[personalityId]?.reviewIds,
  ],
  (byId, reviewIds) => {
    if (!reviewIds) return undefined;
    return reviewIds.map((id) => byId[id]).filter(Boolean);
  }
);

export const selectPersonalityStats = (state: RootState, personalityId: string) =>
  state.reviews.byPersonality[personalityId]?.stats || null;

export const selectHasMoreReviews = (state: RootState, personalityId: string) =>
  state.reviews.byPersonality[personalityId]?.nextCursor !== null;

export const selectReviewsNextCursor = (state: RootState, personalityId: string) =>
  state.reviews.byPersonality[personalityId]?.nextCursor || null;

export const selectReviewsLoading = (state: RootState, personalityId: string) =>
  state.reviews.byPersonality[personalityId]?.loading || false;

export const selectReviewsError = (state: RootState, personalityId: string) =>
  state.reviews.byPersonality[personalityId]?.error || null;

export const selectIsCreating = (state: RootState) => state.reviews.creating;
export const selectCreateError = (state: RootState) => state.reviews.createError;

export const selectIsUpdating = (state: RootState, reviewId: string) =>
  state.reviews.updating[reviewId] || false;
export const selectUpdateError = (state: RootState, reviewId: string) =>
  state.reviews.updateErrors[reviewId] || null;

export const selectIsDeleting = (state: RootState, reviewId: string) =>
  state.reviews.deleting[reviewId] || false;
export const selectDeleteError = (state: RootState, reviewId: string) =>
  state.reviews.deleteErrors[reviewId] || null;

// ============================================================================
// Actions & Reducer Export
// ============================================================================

export const {
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  resetPersonalityReviews,
} = reviewSlice.actions;

export default reviewSlice.reducer;