// src/types/personalities.ts
export interface Personality {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatar_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  average_review?: number | null;
  total_reviews: number;  // NEW: backend now returns this
}

export interface PersonalityCreate {
  name: string;
  description?: string;
}

export interface PersonalityUpdate {
  name?: string;
  slug?: string;
  description?: string;
}

export interface PersonalitiesState {
  personalities: Personality[];
  currentPersonality: Personality | null;
  loading: boolean;
  error: string | null;
}

export interface FetchPersonalitiesParams {
  page?: number;          // CHANGED: backend uses page, not offset
  limit?: number;
  search?: string;        // CHANGED: backend uses search, not q
  sort?: string;          // NEW: backend sorting support
  order?: 'asc' | 'desc'; // NEW: sort order
}
