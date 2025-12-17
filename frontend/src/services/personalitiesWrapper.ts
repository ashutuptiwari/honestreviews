import { fetchWithAuth } from '@/services/authWrapper';
import {
  Personality,
  PersonalityCreate,
  PersonalityUpdate,
  FetchPersonalitiesParams,
} from '@/types/personalities';

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
 * List personalities for an organization
 * UPDATED: Now uses page-based pagination with search and sorting
 */
export const listPersonalities = async (
  orgSlug: string,
  params?: FetchPersonalitiesParams
): Promise<Personality[]> => {
  // Only allow backend-accepted sort fields
  const ALLOWED_SORTS = new Set(['created_at', 'average_review', 'total_reviews', 'name']);
  const sortParam = params?.sort && ALLOWED_SORTS.has(params.sort) ? params.sort : undefined;
  const orderParam = params?.order && (params.order === 'asc' || params.order === 'desc') ? params.order : undefined;

  const queryString = buildQueryString({
    page: params?.page || 1,
    limit: params?.limit || 25,
    search: params?.search || undefined,
    sort: sortParam,
    order: orderParam,
  });

  const url = `${API_BASE}/orgs/${orgSlug}/personalities${queryString}`;
  const res = await fetchWithAuth(url);
  return handleResponse<Personality[]>(res);
};

/**
 * Get a single personality by slug
 */
export const getPersonality = async (
  orgSlug: string,
  personalitySlug: string
): Promise<Personality> => {
  const res = await fetchWithAuth(
    `${API_BASE}/orgs/${orgSlug}/personalities/${personalitySlug}`
  );
  return handleResponse<Personality>(res);
};

/**
 * Create a new personality
 */
export const createPersonality = async (
  orgSlug: string,
  payload: PersonalityCreate
): Promise<Personality> => {
  const res = await fetchWithAuth(
    `${API_BASE}/orgs/${orgSlug}/personalities`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<Personality>(res);
};

/**
 * Update an existing personality
 */
export const updatePersonality = async (
  orgSlug: string,
  personalitySlug: string,
  payload: PersonalityUpdate
): Promise<Personality> => {
  const res = await fetchWithAuth(
    `${API_BASE}/orgs/${orgSlug}/personalities/${personalitySlug}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<Personality>(res);
};

/**
 * Delete a personality
 */
export const deletePersonality = async (
  orgSlug: string,
  personalitySlug: string
): Promise<void> => {
  const res = await fetchWithAuth(
    `${API_BASE}/orgs/${orgSlug}/personalities/${personalitySlug}`,
    {
      method: 'DELETE',
    }
  );
  
  if (!res.ok && res.status !== 204) {
    await handleResponse(res); // will throw
  }
};
