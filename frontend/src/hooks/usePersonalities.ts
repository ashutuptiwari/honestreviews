import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';

import {
  fetchPersonalities,
  fetchPersonalityBySlug,
  createPersonality as createPersonalityAction,
  updatePersonality as updatePersonalityAction,
  deletePersonality as deletePersonalityAction,
  
  setSearchQuery,
  setSorting,
  setCurrentOrg,
  resetPersonalityList,
  clearCurrentPersonality,
  
  selectPersonalities,
  selectCurrentPersonality,
  selectPersonalitiesLoading,
  selectPersonalitiesError,
  selectHasMorePersonalities,
  selectPersonalitiesPage,
  selectPersonalitiesSort,
  selectPersonalitiesOrder,
  selectPersonalitiesSearchQuery,
} from '@/store/personalitySlice';

/* =========================================================
   INFINITE PERSONALITIES
========================================================= */

export function useInfinitePersonalities(params: {
  orgSlug: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  autoFetch?: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const autoFetch = params?.autoFetch ?? true;

  const items = useSelector(selectPersonalities);
  const loading = useSelector(selectPersonalitiesLoading);
  const error = useSelector(selectPersonalitiesError);
  const hasMore = useSelector(selectHasMorePersonalities);
  const currentPage = useSelector(selectPersonalitiesPage);
  const currentSort = useSelector(selectPersonalitiesSort);
  const currentOrder = useSelector(selectPersonalitiesOrder);
  const searchQuery = useSelector(selectPersonalitiesSearchQuery);

  // Set current org (resets list if org changes)
  useEffect(() => {
    dispatch(setCurrentOrg(params.orgSlug));
  }, [params.orgSlug, dispatch]);

  // Update sorting when params change
  useEffect(() => {
    if (params?.sort && params?.order) {
      if (params.sort !== currentSort || params.order !== currentOrder) {
        dispatch(setSorting({ sort: params.sort, order: params.order }));
      }
    }
  }, [params?.sort, params?.order, currentSort, currentOrder, dispatch]);

  // Update search when params change
  useEffect(() => {
    const newSearch = params?.search || '';
    if (newSearch !== searchQuery) {
      dispatch(setSearchQuery(newSearch));
    }
  }, [params?.search, searchQuery, dispatch]);

  // Initial fetch - trigger when org changes, search/sort changes, or user manually initiates
  // Do NOT refetch if list is already confirmed empty (hasMore === false means we've received data)
  useEffect(() => {
    if (autoFetch && currentPage === 1 && items.length === 0 && !loading && hasMore) {
      dispatch(fetchPersonalities({ orgSlug: params.orgSlug, page: 1 }));
    }
  }, [autoFetch, currentPage, loading, params.orgSlug, dispatch, hasMore]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchPersonalities({ 
        orgSlug: params.orgSlug, 
        page: currentPage + 1 
      }));
    }
  }, [loading, hasMore, currentPage, params.orgSlug, dispatch]);

  const refetch = useCallback(() => {
    dispatch(resetPersonalityList());
    dispatch(fetchPersonalities({ orgSlug: params.orgSlug, page: 1 }));
  }, [params.orgSlug, dispatch]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

/* =========================================================
   SINGLE PERSONALITY
========================================================= */

export function usePersonality(
  orgSlug: string | null,
  personalitySlug: string | null,
  autoFetch = true
) {
  const dispatch = useDispatch<AppDispatch>();

  const personality = useSelector(selectCurrentPersonality);
  const loading = useSelector(selectPersonalitiesLoading);
  const error = useSelector(selectPersonalitiesError);

  useEffect(() => {
    if (autoFetch && orgSlug && personalitySlug) {
      dispatch(fetchPersonalityBySlug({ orgSlug, personalitySlug }));
    }
  }, [autoFetch, orgSlug, personalitySlug, dispatch]);

  const refetch = useCallback(() => {
    if (orgSlug && personalitySlug) {
      dispatch(fetchPersonalityBySlug({ orgSlug, personalitySlug }));
    }
  }, [orgSlug, personalitySlug, dispatch]);

  const clear = useCallback(() => {
    dispatch(clearCurrentPersonality());
  }, [dispatch]);

  return { personality, loading, error, refetch, clear };
}

/* =========================================================
   CREATE / UPDATE / DELETE
========================================================= */

export function useCreatePersonality() {
  const dispatch = useDispatch<AppDispatch>();

  const createPersonality = useCallback(async (
    orgSlug: string,
    payload: { name: string; description?: string }
  ) => {
    const result = await dispatch(createPersonalityAction({ orgSlug, payload }));
    if (createPersonalityAction.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.error.message || 'Failed to create personality');
  }, [dispatch]);

  return { createPersonality };
}

export function useUpdatePersonality() {
  const dispatch = useDispatch<AppDispatch>();

  const updatePersonality = useCallback(async (
    orgSlug: string,
    personalitySlug: string,
    payload: { name?: string; description?: string }
  ) => {
    const result = await dispatch(updatePersonalityAction({ 
      orgSlug, 
      personalitySlug, 
      payload 
    }));
    if (updatePersonalityAction.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.error.message || 'Failed to update personality');
  }, [dispatch]);

  return { updatePersonality };
}

export function useDeletePersonality() {
  const dispatch = useDispatch<AppDispatch>();

  const deletePersonality = useCallback(async (
    orgSlug: string,
    personalitySlug: string
  ) => {
    const result = await dispatch(deletePersonalityAction({ 
      orgSlug, 
      personalitySlug 
    }));
    if (deletePersonalityAction.fulfilled.match(result)) {
      return;
    }
    throw new Error(result.error.message || 'Failed to delete personality');
  }, [dispatch]);

  return { deletePersonality };
}