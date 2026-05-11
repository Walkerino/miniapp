import { customGet } from './customRequests';
import type { UserData } from 'entities/user/model/types';

export const userApi = {
  me() {
    return customGet<UserData>('/api/auth/me');
  },
};
