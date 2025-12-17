// frontend/src/types/orgs.ts 
export interface OrgSummary {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_by: string;
  created_at: string;
  members_count: number;        // NEW: backend now returns this
  personalities_count: number;  // NEW: backend now returns this
  reviews_count: number;        // NEW: backend now returns this
}

export interface OrgDetail extends OrgSummary {
  // Additional fields can be added here when backend provides them
}

export interface OrgMember {
  id: string;
  org_id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  member_id: string;
  role: OrgRole;
  joined_at: string;
}

export type OrgRole = 'creator' | 'moderator' | 'member';

export interface OrgCreatePayload {
  name: string;
  description?: string;
}

export interface OrgUpdatePayload {
  name?: string;
  description?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;   // NEW: backend sorting
  order?: 'asc' | 'desc';  // NEW: sort order
}

export interface SearchParams extends PaginationParams {
  search?: string;
}

export interface OrgWithMembership extends OrgSummary {
  is_member: boolean;
  member_role: 'creator' | 'moderator' | 'member' | null;
}
