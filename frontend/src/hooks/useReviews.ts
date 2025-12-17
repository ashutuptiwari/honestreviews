import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';

import {
  fetchReviews,
  createReview as createReviewAction,
  updateReview as updateReviewAction,
  deleteReview as deleteReviewAction,
  resetPersonalityReviews,
  
  selectPersonalityReviewsList,
  selectPersonalityStats,
  selectHasMoreReviews,
  selectReviewsNextCursor,
  selectReviewsLoading,
  selectReviewsError,
  selectIsCreating,
  selectCreateError,
  selectIsUpdating,
  selectIsDeleting,
} from '@/store/reviewSlice';

/* =========================================================
   INFINITE REVIEWS (cursor-based pagination)
========================================================= */

export function useInfiniteReviews(params: {
  orgSlug: string;
  personalitySlug: string;
  personalityId: string;
  sort?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc';
  ratingMin?: number;
  ratingMax?: number;
  autoFetch?: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const autoFetch = params?.autoFetch ?? true;

  // Selectors
  // Apply fallback locally (do NOT return [] from the selector). This keeps
  // selectors referentially stable while components/hooks choose defaults.
  const items = useSelector((state: RootState) => 
    selectPersonalityReviewsList(state, params.personalityId)
  ) ?? [];
  const stats = useSelector((state: RootState) => 
    selectPersonalityStats(state, params.personalityId)
  );
  const hasMore = useSelector((state: RootState) => 
    selectHasMoreReviews(state, params.personalityId)
  );
  const nextCursor = useSelector((state: RootState) => 
    selectReviewsNextCursor(state, params.personalityId)
  );
  const loading = useSelector((state: RootState) => 
    selectReviewsLoading(state, params.personalityId)
  );
  const error = useSelector((state: RootState) => 
    selectReviewsError(state, params.personalityId)
  );

  // Reset reviews when filters change
  useEffect(() => {
    dispatch(resetPersonalityReviews(params.personalityId));
  }, [params.sort, params.ratingMin, params.ratingMax, params.personalityId, dispatch]);

  // Initial fetch - prevent infinite loop by checking hasMore
  // When hasMore === false, we've already fetched and confirmed empty results
  useEffect(() => {
    if (autoFetch && items.length === 0 && !loading && hasMore && !nextCursor) {
      dispatch(fetchReviews({
        orgSlug: params.orgSlug,
        personalitySlug: params.personalitySlug,
        personalityId: params.personalityId,
        params: {
          sort: params.sort,
          rating_min: params.ratingMin,
          rating_max: params.ratingMax,
        },
      }));
    }
  }, [
    autoFetch,
    loading,
    params.orgSlug,
    params.personalitySlug,
    params.personalityId,
    params.sort,
    params.ratingMin,
    params.ratingMax,
    dispatch,
    hasMore,
    nextCursor,
  ]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && nextCursor) {
      dispatch(fetchReviews({
        orgSlug: params.orgSlug,
        personalitySlug: params.personalitySlug,
        personalityId: params.personalityId,
        params: {
          cursor: nextCursor,
          sort: params.sort,
          rating_min: params.ratingMin,
          rating_max: params.ratingMax,
        },
      }));
    }
  }, [
    loading,
    hasMore,
    nextCursor,
    params.orgSlug,
    params.personalitySlug,
    params.personalityId,
    params.sort,
    params.ratingMin,
    params.ratingMax,
    dispatch,
  ]);

  const refetch = useCallback(() => {
    dispatch(resetPersonalityReviews(params.personalityId));
    dispatch(fetchReviews({
      orgSlug: params.orgSlug,
      personalitySlug: params.personalitySlug,
      personalityId: params.personalityId,
      params: {
        sort: params.sort,
        rating_min: params.ratingMin,
        rating_max: params.ratingMax,
      },
    }));
  }, [
    params.orgSlug,
    params.personalitySlug,
    params.personalityId,
    params.sort,
    params.ratingMin,
    params.ratingMax,
    dispatch,
  ]);

  return {
    items,
    stats,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

/* =========================================================
   CREATE REVIEW
========================================================= */

export function useCreateReview() {
  const dispatch = useDispatch<AppDispatch>();
  
  const isCreating = useSelector(selectIsCreating);
  const createError = useSelector(selectCreateError);

  const createReview = useCallback(async (
    orgSlug: string,
    personalitySlug: string,
    personalityId: string,
    payload: { title: string; body: string; rating: number }
  ) => {
    const result = await dispatch(createReviewAction({
      orgSlug,
      personalitySlug,
      personalityId,
      payload,
    }));
    
    if (createReviewAction.fulfilled.match(result)) {
      return result.payload.review;
    }
    throw new Error(result.error.message || 'Failed to create review');
  }, [dispatch]);

  return { createReview, isCreating, createError };
}

/* =========================================================
   UPDATE REVIEW
========================================================= */

export function useUpdateReview(reviewId: string) {
  const dispatch = useDispatch<AppDispatch>();
  
  const isUpdating = useSelector((state: RootState) => 
    selectIsUpdating(state, reviewId)
  );

  const updateReview = useCallback(async (
    payload: { title?: string; body?: string; rating?: number }
  ) => {
    const result = await dispatch(updateReviewAction({
      reviewId,
      payload,
    }));
    
    if (updateReviewAction.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.error.message || 'Failed to update review');
  }, [reviewId, dispatch]);

  return { updateReview, isUpdating };
}

/* =========================================================
   DELETE REVIEW
========================================================= */

export function useDeleteReview() {
  const dispatch = useDispatch<AppDispatch>();

  const deleteReview = useCallback(async (
    reviewId: string,
    personalityId: string
  ) => {
    const result = await dispatch(deleteReviewAction({
      reviewId,
      personalityId,
    }));
    
    if (deleteReviewAction.fulfilled.match(result)) {
      return;
    }
    throw new Error(result.error.message || 'Failed to delete review');
  }, [dispatch]);

  return { deleteReview };
}

export function useIsDeleting(reviewId: string) {
  return useSelector((state: RootState) => 
    selectIsDeleting(state, reviewId)
  );
}