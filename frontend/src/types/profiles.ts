// src/types/profile.ts

/**
 * Profile type matching backend ProfileOut schema.
 */
export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Payload for updating profile (personal profile only).
 */
export interface ProfileUpdatePayload {
  bio?: string | null;
}