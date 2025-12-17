// src/services/profileWrapper.ts
import { Profile, ProfileUpdatePayload } from '@/types/profiles';
import { fetchWithAuth, handleJsonResponse } from './authWrapper';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/**
 * Fetch the current user's profile (personal, requires auth).
 * GET /profile/me
 */
export async function fetchProfile(): Promise<Profile> {
  const res = await fetchWithAuth(`${API_BASE}/profile/me`, {
    method: 'GET',
  });

  const json = await handleJsonResponse(res);
  return json as Profile;
}

/**
 * Update the current user's profile (personal, requires auth).
 * PATCH /profile/me
 */
export async function updateProfile(payload: ProfileUpdatePayload): Promise<Profile> {
  const res = await fetchWithAuth(`${API_BASE}/profile/me`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const json = await handleJsonResponse(res);
  return json as Profile;
}

/**
 * Fetch a public profile by username (no auth required).
 * GET /profiles/{username}
 */
export async function fetchPublicProfile(username: string): Promise<Profile> {
  const res = await fetch(`${API_BASE}/profiles/${username}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Handle errors manually since we're not using fetchWithAuth
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text}`);
  }

  if (!res.ok) {
    const msg = json.detail || json.message || json.error || JSON.stringify(json);
    const err = new Error(msg || `Request failed with status ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  return json as Profile;
}