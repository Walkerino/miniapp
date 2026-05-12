import { customGet, customPost } from 'api';
import type { AuthUser } from 'entities/user';
import type { Miniapp } from 'entities/miniapp';
import type {
  AdminMetricsResponse,
  AdminMiniappListResponse,
  AdminUserListResponse,
} from 'entities/admin/model/types';

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

export const adminApi = {
  getUsers(search = '', limit = 25) {
    return customGet<AdminUserListResponse>(
      withQuery('/api/admin/users', { page: 1, limit, search })
    );
  },
  promoteUser(email: string) {
    return customPost<{ email: string }, AuthUser>('/api/admin/users/promote', { email });
  },
  getMetrics() {
    return customGet<AdminMetricsResponse>('/api/admin/miniapps?metrics=true');
  },
  getPendingMiniapps(limit = 50) {
    return customGet<AdminMiniappListResponse>(
      withQuery('/api/admin/miniapps', { page: 1, limit, status: 'pending' })
    );
  },
  publishMiniapp(id: string) {
    return customPost<void, Miniapp>(`/api/admin/miniapps/${id}/publish`, undefined);
  },
  rejectMiniapp(id: string, reason: string) {
    return customPost<{ reason: string }, Miniapp>(`/api/admin/miniapps/${id}/reject`, { reason });
  },
};
