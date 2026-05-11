import type { StatusType } from 'shared/types';

export type UserRole = 'user' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Miniapp = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  status: StatusType;
  created_by: string;
  updated_by: string | null;
  launches_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type MiniappCardData = Pick<
  Miniapp,
  'id' | 'title' | 'description' | 'url' | 'status' | 'is_favorite'
>;

export type MiniappListResponse = {
  items: Miniapp[];
  page: number;
  limit: number;
  total: number;
};

export type MiniappListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: StatusType;
};

export type MiniappFormData = {
  title: string;
  description: string;
  url: string;
  status: StatusType;
};

export type CreateMiniappRequest = {
  title: string;
  description?: string;
  url: string;
  status?: StatusType;
};

export type UpdateMiniappRequest = Partial<CreateMiniappRequest>;
