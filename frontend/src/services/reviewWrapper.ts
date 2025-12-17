import { fetchWithAuth } from '@/services/authWrapper';
import type {
  Review,
  ReviewsListResponse,
  CreateReviewPayload,
  UpdateReviewPayload,
  ReviewsListParams,
} from '@/types/reviews';

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
 * Create a review for a personality
 */
export async function createReview(
  orgSlug: string,
  personalitySlug: string,
  payload: CreateReviewPayload
): Promise<Review> {
  console.log(JSON.stringify(payload));
  
  const response = await fetchWithAuth(
    `${API_BASE}/orgs/${orgSlug}/personalities/${personalitySlug}/reviews`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );

  return handleResponse<Review>(response);
}

/**
 * List reviews for a personality with cursor-based pagination
 */
export async function listReviews(
  orgSlug: string,
  personalitySlug: string,
  params?: ReviewsListParams
): Promise<ReviewsListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.cursor) queryParams.set('cursor', params.cursor);
  if (params?.sort) {
    // Only allow backend-accepted review sort values
    const ALLOWED = new Set(['newest','oldest','rating_desc','rating_asc']);
    if (ALLOWED.has(params.sort)) queryParams.set('sort', params.sort);
  }
  if (params?.rating_min !== undefined) queryParams.set('rating_min', params.rating_min.toString());
  if (params?.rating_max !== undefined) queryParams.set('rating_max', params.rating_max.toString());

  const url = `${API_BASE}/orgs/${orgSlug}/personalities/${personalitySlug}/reviews${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await fetchWithAuth(url, {
    method: 'GET',
  });

  return handleResponse<ReviewsListResponse>(response);
}

/**
 * Get a single review
 * Note: Backend doesn't have this endpoint - would need to fetch from list
 * TODO: Add GET /reviews/{review_id} endpoint on backend if needed
 */
export async function getReview(
  orgSlug: string,
  personalitySlug: string,
  reviewId: string
): Promise<Review> {
  // WORKAROUND: Backend doesn't have single review endpoint
  // Would need to either add it or fetch from the list and filter
  throw new Error('Get single review endpoint not implemented on backend yet');
}

/**
 * Update a review (only author can update)
 */
export async function updateReview(
  reviewId: string,
  payload: UpdateReviewPayload
): Promise<Review> {
  const response = await fetchWithAuth(
    `${API_BASE}/reviews/${reviewId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );

  return handleResponse<Review>(response);
}

/**
 * Delete a review (author or org moderator can delete)
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE}/reviews/${reviewId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok && response.status !== 204) {
    await handleResponse(response); // will throw
  }
}
