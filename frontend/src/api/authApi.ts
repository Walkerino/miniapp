import type { AuthUser } from 'entities/user';

import { customGet, customPost } from './customRequests';

export type RegisterData = {
  email: string;
  password: string;
  name: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type AuthResponse = {
  access_token: string;
  user: AuthUser;
};

function register(data: RegisterData) {
  return customPost<RegisterData, AuthResponse>('/api/auth/register', data);
}

export const authApi = {
  register,
  signUp: register,

  login(data: LoginData) {
    return customPost<LoginData, AuthResponse>('/api/auth/login', data);
  },

  refresh() {
    return customPost<void, AuthResponse>('/api/auth/refresh');
  },

  logout() {
    return customPost<void, void>('/api/auth/logout');
  },

  me() {
    return customGet<AuthUser>('/api/auth/me');
  },
};

export type SignUpData = RegisterData;
