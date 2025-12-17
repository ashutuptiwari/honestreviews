// frontend/src/store/orgsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type {
  OrgWithMembership,
  OrgDetail,
  OrgMember,
} from '@/types/orgs';
import * as orgsService from '@/services/orgsWrapper';

interface OrgsState {
  /* ---------- LIST ---------- */
  list: OrgWithMembership[];
  listLoading: boolean;
  listError: string | null;

  /* ---------- PAGINATION ---------- */
  currentPage: number;
  pageSize: number;
  hasMore: boolean;

  /* ---------- SEARCH & SORTING ---------- */
  searchQuery: string;
  sort: string;           // NEW: sort field (created_at, members_count, etc.)
  order: 'asc' | 'desc';  // NEW: sort order

  /* ---------- DETAIL ---------- */
  bySlug: Record<string, OrgDetail>;
  detailLoading: Record<string, boolean>;
  detailError: Record<string, string | null>;

  /* ---------- MEMBERS ---------- */
  membersBySlug: Record<string, OrgMember[]>;
  membersLoading: Record<string, boolean>;

  /* ---------- UI ---------- */
  currentSlug: string | null;
}

const initialState: OrgsState = {
  list: [],
  listLoading: false,
  listError: null,

  currentPage: 1,
  pageSize: 25,
  hasMore: true,

  searchQuery: '',
  sort: 'created_at',     // NEW: default sort
  order: 'desc',          // NEW: default order

  bySlug: {},
  detailLoading: {},
  detailError: {},

  membersBySlug: {},
  membersLoading: {},

  currentSlug: null,
};

/* ===========================
   THUNKS
=========================== */

export const fetchOrgs = createAsyncThunk(
  'orgs/fetchOrgs',
  async (
    params: { 
      page?: number; 
      limit?: number; 
      search?: string;
      sort?: string;        // NEW
      order?: 'asc' | 'desc'; // NEW
    } = {},
    { getState }
  ) => {
    const state = getState() as RootState;
    const page = params.page ?? state.orgs.currentPage;
    const limit = params.limit ?? state.orgs.pageSize;
    const search = params.search ?? state.orgs.searchQuery;
    const sort = params.sort ?? state.orgs.sort;        // NEW
    const order = params.order ?? state.orgs.order;     // NEW

    const data = await orgsService.listOrgsWithMembership({
      page,
      limit,
      search,
      sort,   // NEW: pass to backend
      order,  // NEW: pass to backend
    });

    return { data, page };
  }
);

export const fetchOrg = createAsyncThunk(
  'orgs/fetchOrg',
  async (slug: string, { getState }) => {
    // If org already exists in state, return it without API call
    const state = getState() as RootState;
    if (state.orgs.bySlug[slug]) {
      return state.orgs.bySlug[slug];
    }
    return await orgsService.getOrg(slug);
  }
);

export const createOrg = createAsyncThunk(
  'orgs/createOrg',
  async (payload: { name: string; description?: string }) => {
    return await orgsService.createOrg(payload);
  }
);

export const updateOrg = createAsyncThunk(
  'orgs/updateOrg',
  async ({ slug, payload }: { slug: string; payload: { name?: string; description?: string } }) => {
    return await orgsService.updateOrg(slug, payload);
  }
);

export const deleteOrg = createAsyncThunk(
  'orgs/deleteOrg',
  async (slug: string) => {
    await orgsService.deleteOrg(slug);
    return slug;
  }
);

export const joinOrg = createAsyncThunk<
  { slug: string },
  string
>(
  'orgs/joinOrg',
  async (slug: string) => {
    await orgsService.joinOrg(slug);
    return { slug };
  }
);

export const fetchOrgMembers = createAsyncThunk(
  'orgs/fetchOrgMembers',
  async ({ 
    slug, 
    page, 
    limit,
    sort,         // NEW
    order,        // NEW
  }: { 
    slug: string; 
    page?: number; 
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }) => {
    const members = await orgsService.listOrgMembers(slug, { 
      page, 
      limit,
      sort,   // NEW
      order,  // NEW
    });
    return { slug, members };
  }
);

export const promoteMember = createAsyncThunk(
  'orgs/promoteMember',
  async ({ slug, profileId }: { slug: string; profileId: string }) => {
    await orgsService.promoteMember(slug, profileId);
    return { slug, profileId };
  }
);

/* ===========================
   SLICE
=========================== */

const orgsSlice = createSlice({
  name: 'orgs',
  initialState,
  reducers: {
    setCurrentSlug(state, action: PayloadAction<string | null>) {
      state.currentSlug = action.payload;
    },

    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.currentPage = 1;
      state.hasMore = true;
      state.list = [];        // Reset list when search changes
    },

    // NEW: Set sort/order and reset list
    setSorting(state, action: PayloadAction<{ sort: string; order: 'asc' | 'desc' }>) {
      state.sort = action.payload.sort;
      state.order = action.payload.order;
      state.currentPage = 1;
      state.hasMore = true;
      state.list = [];        // Reset list when sorting changes
    },

    resetOrgList(state) {
      state.list = [];
      state.currentPage = 1;
      state.hasMore = true;
      state.listError = null;
    },

    clearOrgDetail(state, action: PayloadAction<string>) {
      const slug = action.payload;
      delete state.bySlug[slug];
      delete state.detailLoading[slug];
      delete state.detailError[slug];
      delete state.membersBySlug[slug];
      delete state.membersLoading[slug];
    },
  },

  extraReducers: (builder) => {
    /* ---------- LIST ---------- */
    builder.addCase(fetchOrgs.pending, (state) => {
      state.listLoading = true;
      state.listError = null;
    });

    // JOIN ORG (OPTIMISTIC)
    builder.addCase(joinOrg.pending, (state, action) => {
      const slug = action.meta.arg;

      const org = state.list.find(o => o.slug === slug);
      if (org) {
        org.is_member = true;
        org.member_role = 'member';
        org.members_count += 1;  // NEW: optimistically increment count
      }
    });

    builder.addCase(joinOrg.fulfilled, (state, action) => {
      const { slug } = action.payload;
      // No-op: already updated optimistically
    });

    builder.addCase(joinOrg.rejected, (state, action) => {
      const slug = action.meta.arg;

      // Rollback
      const org = state.list.find(o => o.slug === slug);
      if (org) {
        org.is_member = false;
        org.member_role = null as any;
        org.members_count -= 1;  // NEW: rollback count
      }
    });

    builder.addCase(fetchOrgs.fulfilled, (state, action) => {
      const { data, page } = action.payload;

      state.listLoading = false;
      state.currentPage = page;

      if (page === 1) {
        // Initial load or refresh
        state.list = data;
      } else {
        // Infinite scroll: append new results
        state.list.push(...data);
      }

      // Check if there are more results
      state.hasMore = data.length === state.pageSize;
    });

    builder.addCase(fetchOrgs.rejected, (state, action) => {
      state.listLoading = false;
      state.listError = action.error.message || 'Failed to fetch organizations';
    });

    /* ---------- DETAIL ---------- */
    builder.addCase(fetchOrg.pending, (state, action) => {
      const slug = action.meta.arg;
      state.detailLoading[slug] = true;
      state.detailError[slug] = null;
    });

    builder.addCase(fetchOrg.fulfilled, (state, action) => {
      const org = action.payload;
      state.detailLoading[org.slug] = false;
      state.bySlug[org.slug] = org;
    });

    builder.addCase(fetchOrg.rejected, (state, action) => {
      const slug = action.meta.arg;
      state.detailLoading[slug] = false;
      state.detailError[slug] = action.error.message || 'Failed to fetch organization';
    });

    /* ---------- CREATE / UPDATE / DELETE ---------- */
    builder.addCase(createOrg.fulfilled, (state, action) => {
      const org = action.payload;
      state.list.unshift({
        ...org,
        is_member: true,
        member_role: 'creator',
      });
      state.bySlug[org.slug] = org;
    });

    builder.addCase(updateOrg.fulfilled, (state, action) => {
      const org = action.payload;
      state.bySlug[org.slug] = org;

      const idx = state.list.findIndex(o => o.slug === org.slug);
      if (idx !== -1) {
        state.list[idx] = {
          ...state.list[idx],
          ...org,
        };
      }
    });

    builder.addCase(deleteOrg.fulfilled, (state, action) => {
      const slug = action.payload;
      state.list = state.list.filter(o => o.slug !== slug);
      delete state.bySlug[slug];
      if (state.currentSlug === slug) state.currentSlug = null;
    });

    /* ---------- MEMBERS ---------- */
    builder.addCase(fetchOrgMembers.pending, (state, action) => {
      state.membersLoading[action.meta.arg.slug] = true;
    });

    builder.addCase(fetchOrgMembers.fulfilled, (state, action) => {
      const { slug, members } = action.payload;
      state.membersLoading[slug] = false;
      state.membersBySlug[slug] = members;
    });

    builder.addCase(fetchOrgMembers.rejected, (state, action) => {
      state.membersLoading[action.meta.arg.slug] = false;
    });
  },
});

export const {
  setCurrentSlug,
  setSearchQuery,
  setSorting,      // NEW: export sorting action
  resetOrgList,
  clearOrgDetail,
} = orgsSlice.actions;

/* ===========================
   SELECTORS
=========================== */

export const selectOrgList = (state: RootState) => state.orgs.list;
export const selectOrgListLoading = (state: RootState) => state.orgs.listLoading;
export const selectOrgListError = (state: RootState) => state.orgs.listError;
export const selectHasMoreOrgs = (state: RootState) => state.orgs.hasMore;
export const selectCurrentPage = (state: RootState) => state.orgs.currentPage;
export const selectOrgSort = (state: RootState) => state.orgs.sort;       // NEW
export const selectOrgOrder = (state: RootState) => state.orgs.order;     // NEW

export const selectOrgDetailLoading = (slug: string) => (state: RootState) =>
  state.orgs.detailLoading[slug] || false;

export const selectOrgDetailError = (slug: string) => (state: RootState) =>
  state.orgs.detailError[slug] || null;

export const selectOrgBySlug = (slug: string) => (state: RootState) =>
  state.orgs.bySlug[slug];

export const selectOrgMembers = (slug: string) => (state: RootState) =>
  state.orgs.membersBySlug[slug];

export const selectIsOrgMember = (slug: string, userId?: string) =>
  (state: RootState): boolean => {
    if (!slug || !userId) return false;

    // Membership info ONLY lives in OrgWithMembership
    const org = state.orgs.list.find(o => o.slug === slug);

    return Boolean(org?.is_member);
  };

export const selectOrgMembersLoading = (slug: string) => (state: RootState) =>
  state.orgs.membersLoading[slug] || false;

export const selectCanModerateOrg =
  (slug: string, userId?: string) =>
  (state: RootState): boolean => {
    if (!slug || !userId) return false;

    const members = state.orgs.membersBySlug[slug];
    if (!members) return false;

    const me = members.find(m => m.member_id === userId);
    return me?.role === 'creator' || me?.role === 'moderator';
  };

export default orgsSlice.reducer;
