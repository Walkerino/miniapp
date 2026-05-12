import type { AuthUser } from 'entities/user';
import type { Miniapp } from 'entities/miniapp';

export type AdminUserListResponse = {
  items: AuthUser[];
  page: number;
  limit: number;
  total: number;
};

export type AdminMetricsResponse = {
  total_miniapps: number;
  active_miniapps: number;
  pending_miniapps: number;
  rejected_miniapps: number;
  total_launches: number;
  launches_today: number;
  launches_this_week: number;
};

export type AdminMiniappListResponse = {
  items: Miniapp[];
  page: number;
  limit: number;
  total: number;
};
