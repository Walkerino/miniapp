import type { StatusType } from 'shared/types';

export type UserRole = 'user' | 'admin';

export const miniappCategories = [
  'Finance',
  'E-commerce',
  'Food & Delivery',
  'Transport & Travel',
  'Government & Public Services',
  'Education',
  'Healthcare',
  'Entertainment & Media',
  'Business & Productivity',
  'Utilities & Lifestyle',
] as const;

export type MiniappCategory = (typeof miniappCategories)[number];

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
  category: MiniappCategory;
  status: StatusType;
  reject_reason?: string | null;
  created_by: string;
  updated_by: string | null;
  launches_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type LaunchMiniappResponse = {
  launch_url: string;
  launch_token: string;
  expires_at: string;
};

export type FavoriteResponse = {
  user_id: string;
  miniapp_id: string;
  created_at: string;
};

export type MiniappCardData = Pick<
  Miniapp,
  'id' | 'title' | 'description' | 'url' | 'category' | 'status' | 'is_favorite'
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
  category: MiniappCategory;
  status: StatusType;
};

export type CreateMiniappRequest = {
  title: string;
  description?: string;
  url: string;
  category: MiniappCategory;
  status?: StatusType;
};

export type UpdateMiniappRequest = Partial<CreateMiniappRequest>;
