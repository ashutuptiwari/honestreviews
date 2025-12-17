// frontend/src/types/reviews.ts
export interface ProfileSummary {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface PersonalitySummary {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  organization: OrganizationSummary;
}

export interface Review {
  id: string;
  personality: PersonalitySummary;
  author: ProfileSummary | null;
  title: string;
  body: string;
  rating: number; // 1-5 scale (backend updated)
  created_at: string;
  updated_at: string;
}

export interface ReviewListItem {
  id: string;
  title: string;
  rating: number;
  snippet: string;
  author: ProfileSummary | null;
  created_at: string;
}

export interface ReviewStats {
  personality_id: string;
  total_reviews: number;
  average_review: number;
}

export interface ReviewsListResponse {
  items: ReviewListItem[];
  next_cursor: string | null;
  stats: ReviewStats;
}

export interface CreateReviewPayload {
  title: string;
  body: string;
  rating: number; // 1-5 scale
}

export interface UpdateReviewPayload {
  title?: string;
  body?: string;
  rating?: number;
}

export interface ReviewsListParams {
  limit?: number;
  cursor?: string;
  sort?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc';
  rating_min?: number; // 1-5
  rating_max?: number; // 1-5
}