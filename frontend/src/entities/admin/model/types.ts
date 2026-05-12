import type { AuthUser } from 'entities/user';
import type { Miniapp } from 'entities/miniapp';
import type { MiniappCategory } from 'entities/miniapp';
import type { UserRole } from 'entities/miniapp';

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

export type AdminAuditLogItem = {
  id: string;
  actor_id: string;
  actor_role: UserRole;
  actor_email: string;
  action: string;
  miniapp_id: string;
  miniapp_name: string;
  category: MiniappCategory;
  message: string;
  created_at: string;
};

export type AdminAuditLogResponse = {
  items: AdminAuditLogItem[];
  page: number;
  limit: number;
  total: number;
};
