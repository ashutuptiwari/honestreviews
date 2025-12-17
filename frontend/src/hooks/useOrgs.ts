import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';

import {
  fetchOrgs,
  fetchOrg,
  createOrg as createOrgAction,
  updateOrg as updateOrgAction,
  deleteOrg as deleteOrgAction,
  joinOrg as joinOrgAction,
  fetchOrgMembers,
  promoteMember as promoteMemberAction,

  setSearchQuery,
  setSorting,          // NEW
  resetOrgList,

  selectOrgList,
  selectOrgListLoading,
  selectOrgListError,
  selectHasMoreOrgs,
  selectCurrentPage,
  selectOrgSort,       // NEW
  selectOrgOrder,      // NEW
  selectOrgBySlug,
  selectOrgDetailError,
  selectOrgMembers,
  selectOrgMembersLoading,
  selectOrgDetailLoading
} from '@/store/orgsSlice';

/* =========================================================
   ORG LIST (pagination + infinite scroll)
========================================================= */

export function useOrgList(autoFetch = true) {
  const dispatch = useDispatch<AppDispatch>();

  const list = useSelector(selectOrgList);
  const loading = useSelector(selectOrgListLoading);
  const error = useSelector(selectOrgListError);
  const hasMore = useSelector(selectHasMoreOrgs);
  const currentPage = useSelector(selectCurrentPage);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      dispatch(fetchOrgs({ page: 1 }));
    }
  }, [autoFetch, dispatch]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchOrgs({ page: currentPage + 1 }));
    }
  }, [loading, hasMore, currentPage, dispatch]);

  const refetch = useCallback(() => {
    dispatch(resetOrgList());
    dispatch(fetchOrgs({ page: 1 }));
  }, [dispatch]);

  return {
    list,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

/* =========================================================
   INFINITE ORGS (with sorting support)
========================================================= */

export function useInfiniteOrgs(params?: {
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  autoFetch?: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const autoFetch = params?.autoFetch ?? true;

  const list = useSelector(selectOrgList);
  const loading = useSelector(selectOrgListLoading);
  const error = useSelector(selectOrgListError);
  const hasMore = useSelector(selectHasMoreOrgs);
  const currentPage = useSelector(selectCurrentPage);
  const currentSort = useSelector(selectOrgSort);
  const currentOrder = useSelector(selectOrgOrder);

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
    if (params?.search !== undefined) {
      dispatch(setSearchQuery(params.search));
    }
  }, [params?.search, dispatch]);

  // Initial fetch - prevent infinite loop by checking hasMore
  // When hasMore === false, we've already fetched and confirmed empty results
  useEffect(() => {
    if (autoFetch && list.length === 0 && !loading && hasMore && currentPage === 1) {
      dispatch(fetchOrgs({ page: 1 }));
    }
  }, [autoFetch, loading, dispatch, hasMore, currentPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchOrgs({ page: currentPage + 1 }));
    }
  }, [loading, hasMore, currentPage, dispatch]);

  const refetch = useCallback(() => {
    dispatch(resetOrgList());
    dispatch(fetchOrgs({ page: 1 }));
  }, [dispatch]);

  return {
    items: list,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

/* =========================================================
   SINGLE ORG
========================================================= */

export function useOrg(slug: string | null, autoFetch = true) {
  const dispatch = useDispatch<AppDispatch>();

  const org = useSelector(slug ? selectOrgBySlug(slug) : () => null);
  const loading = useSelector(slug ? selectOrgDetailLoading(slug) : () => false);
  const error = useSelector(slug ? selectOrgDetailError(slug) : () => null);

  useEffect(() => {
    // Only fetch if:
    // 1. autoFetch is enabled
    // 2. slug exists
    // 3. We don't have the org cached
    // 4. We're not already loading
    if (autoFetch && slug && !org && !loading) {
      dispatch(fetchOrg(slug));
    }
  }, [autoFetch, slug, org, loading, dispatch]);

  const refetch = useCallback(() => {
    if (slug) dispatch(fetchOrg(slug));
  }, [slug, dispatch]);

  return { org, loading, error, refetch };
}

/* =========================================================
   CREATE / UPDATE / DELETE
========================================================= */

export function useCreateOrg() {
  const dispatch = useDispatch<AppDispatch>();

  const createOrg = useCallback(async (payload: { name: string; description?: string }) => {
    const result = await dispatch(createOrgAction(payload));
    if (createOrgAction.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.error.message || 'Failed to create organization');
  }, [dispatch]);

  return { createOrg };
}

export function useUpdateOrg() {
  const dispatch = useDispatch<AppDispatch>();

  const updateOrg = useCallback(async (
    slug: string,
    payload: { name?: string; description?: string }
  ) => {
    const result = await dispatch(updateOrgAction({ slug, payload }));
    if (updateOrgAction.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error(result.error.message || 'Failed to update organization');
  }, [dispatch]);

  return { updateOrg };
}

export function useDeleteOrg() {
  const dispatch = useDispatch<AppDispatch>();

  const deleteOrg = useCallback(async (slug: string) => {
    const result = await dispatch(deleteOrgAction(slug));
    if (deleteOrgAction.fulfilled.match(result)) {
      return;
    }
    throw new Error(result.error.message || 'Failed to delete organization');
  }, [dispatch]);

  return { deleteOrg };
}

/* =========================================================
   JOIN ORG
========================================================= */

export function useJoinOrg() {
  const dispatch = useDispatch<AppDispatch>();

  const joinOrg = useCallback(async (slug: string) => {
    const result = await dispatch(joinOrgAction(slug));
    if (!joinOrgAction.fulfilled.match(result)) {
      throw new Error(result.error.message || 'Failed to join organization');
    }
  }, [dispatch]);

  return { joinOrg };
}

/* =========================================================
   ORG MEMBERS
========================================================= */

export function useOrgMembers(slug: string | null, autoFetch = true) {
  const dispatch = useDispatch<AppDispatch>();

  const members = useSelector(
  slug ? selectOrgMembers(slug) : () => undefined
) ?? [];

  const loading = useSelector(slug ? selectOrgMembersLoading(slug) : () => false);

  useEffect(() => {
    if (autoFetch && slug) {
      dispatch(fetchOrgMembers({ slug }));
    }
  }, [autoFetch, slug, dispatch]);

  const refetch = useCallback((params?: { 
    page?: number; 
    limit?: number;
    sort?: string;      // NEW
    order?: 'asc' | 'desc'; // NEW
  }) => {
    if (slug) {
      dispatch(fetchOrgMembers({ slug, ...params }));
    }
  }, [slug, dispatch]);

  return { members, loading, refetch };
}

/* =========================================================
   PROMOTE MEMBER
========================================================= */

export function usePromoteMember() {
  const dispatch = useDispatch<AppDispatch>();

  const promoteMember = useCallback(async (slug: string, profileId: string) => {
    const result = await dispatch(promoteMemberAction({ slug, profileId }));
    if (promoteMemberAction.fulfilled.match(result)) {
      dispatch(fetchOrgMembers({ slug }));
      return;
    }
    throw new Error(result.error.message || 'Failed to promote member');
  }, [dispatch]);

  return { promoteMember };
}

/* =========================================================
   SEARCH & SORTING
========================================================= */

export function useOrgSearch() {
  const dispatch = useDispatch<AppDispatch>();

  const search = useCallback((query: string) => {
    dispatch(setSearchQuery(query));
    dispatch(fetchOrgs({ page: 1, search: query }));
  }, [dispatch]);

  return { search };
}

export function useOrgSorting() {
  const dispatch = useDispatch<AppDispatch>();

  const sort = useCallback((field: string, order: 'asc' | 'desc') => {
    dispatch(setSorting({ sort: field, order }));
    dispatch(fetchOrgs({ page: 1, sort: field, order }));
  }, [dispatch]);

  return { sort };
}
