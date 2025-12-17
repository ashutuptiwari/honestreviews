// services/orgsWrapper.ts
import { fetchWithAuth } from '@/services/authWrapper';
import type {
  OrgSummary,
  OrgDetail,
  OrgMember,
  OrgCreatePayload,
  OrgUpdatePayload,
  SearchParams,
  PaginationParams,
  OrgWithMembership
} from '@/types/orgs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/**
 * Helper to handle JSON responses and errors
 */
async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text}`);
  }

  if (!res.ok) {
    const msg = json.detail || json.message || json.error || `Request failed with status ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return json as T;
}

/**
 * Build query string from params object
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params).filter(([_, v]) => v != null);
  if (filtered.length === 0) return '';
  const query = new URLSearchParams(
    filtered.map(([k, v]) => [k, String(v)])
  ).toString();
  return `?${query}`;
}

/**
 * List organizations with optional search and pagination
 */
export async function listOrgs(params?: SearchParams & { sort?: string; order?: string }): Promise<OrgSummary[]> {
  const ALLOWED = new Set(['created_at', 'members_count', 'personalities_count', 'reviews_count', 'name']);
  const sort = params?.sort && ALLOWED.has(params.sort) ? params.sort : undefined;
  const order = params?.order && (params.order === 'asc' || params.order === 'desc') ? params.order : undefined;

  const queryString = buildQueryString({
    page: params?.page || 1,
    limit: params?.limit || 25,
    search: params?.search || undefined,
    sort,
    order,
  });
  
  const res = await fetchWithAuth(`${API_BASE}/orgs${queryString}`);
  return handleResponse<OrgSummary[]>(res);
}

/**
 * Get organization details by slug
 * Note: Backend doesn't have GET /orgs/{slug} endpoint yet - using list + filter for now
 * TODO: Add GET /orgs/{slug} endpoint on backend or use members endpoint to get org info
 */
export async function getOrg(slug: string): Promise<OrgDetail> {
  // WORKAROUND: fetch all orgs and filter by slug
  // In production, backend should have GET /orgs/{slug}
  const orgs = await listOrgs({ limit: 100 }); // get more orgs to increase chance of finding it
  const org = orgs.find(o => o.slug === slug);
  if (!org) {
    const err: any = new Error('Organization not found');
    err.status = 404;
    throw err;
  }
  return org as OrgDetail;
}

/**
 * Create a new organization
 */
export async function createOrg(payload: OrgCreatePayload): Promise<OrgDetail> {
  const res = await fetchWithAuth(`${API_BASE}/orgs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<OrgDetail>(res);
}

/**
 * Update organization
 */
export async function updateOrg(slug: string, payload: OrgUpdatePayload): Promise<OrgDetail> {
  const res = await fetchWithAuth(`${API_BASE}/orgs/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return handleResponse<OrgDetail>(res);
}

/**
 * Delete organization (only creator can delete)
 */
export async function deleteOrg(slug: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/orgs/${slug}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    await handleResponse(res); // will throw
  }
}

/**
 * Join an organization
 */
export async function joinOrg(slug: string): Promise<{ detail: string }> {
  const res = await fetchWithAuth(`${API_BASE}/orgs/${slug}/join`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return handleResponse<{ detail: string }>(res);
}

/**
 * Leave organization
 * Note: Backend doesn't have explicit leave endpoint - would need to implement
 * TODO: Add POST /orgs/{slug}/leave on backend
 */
export async function leaveOrg(slug: string): Promise<void> {
  // Placeholder - backend needs to implement this endpoint
  throw new Error('Leave organization endpoint not implemented on backend yet');
}

/**
 * List organization members
 */
export async function listOrgMembers(slug: string, params?: PaginationParams & { sort?: string; order?: string; search?: string }): Promise<OrgMember[]> {
  // Only allow backend-supported member sort fields
  const ALLOWED = new Set(['joined_at', 'username']);
  const sort = params?.sort && ALLOWED.has(params.sort) ? params.sort : undefined;
  const order = params?.order && (params.order === 'asc' || params.order === 'desc') ? params.order : undefined;

  const queryString = buildQueryString({
    page: params?.page || 1,
    limit: params?.limit || 25,
    search: params?.search || undefined,
    sort,
    order,
  });
  
  const res = await fetchWithAuth(`${API_BASE}/orgs/${slug}/members${queryString}`);
  return handleResponse<OrgMember[]>(res);
}

/**
 * List organizations along with membership info
 * (is current user a member + role)
 */
export async function listOrgsWithMembership(
  params?: SearchParams & { sort?: string; order?: string }
): Promise<OrgWithMembership[]> {
  const ALLOWED = new Set(['created_at', 'members_count', 'personalities_count', 'reviews_count', 'name']);
  const sort = params?.sort && ALLOWED.has(params.sort) ? params.sort : undefined;
  const order = params?.order && (params.order === 'asc' || params.order === 'desc') ? params.order : undefined;

  const queryString = buildQueryString({
    page: params?.page || 1,
    limit: params?.limit || 25,
    search: params?.search || undefined,
    sort,
    order,
  });

  const res = await fetchWithAuth(
    `${API_BASE}/orgs/with-membership${queryString}`
  );

  return handleResponse<OrgWithMembership[]>(res);
}


/**
 * Promote member to moderator (creator only)
 */
export async function promoteMember(slug: string, profileId: string): Promise<{ detail: string }> {
  const res = await fetchWithAuth(`${API_BASE}/orgs/${slug}/promote/${profileId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return handleResponse<{ detail: string }>(res);
}

/**
 * Search organizations (uses same endpoint as list with search param)
 */
export async function searchOrgs(query: string, params?: PaginationParams): Promise<OrgSummary[]> {
  return listOrgs({ ...params, search: query });
}
