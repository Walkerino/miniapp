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
  refresh_token: string;
  user: AuthUser;
};

export type RefreshTokenData = {
  refresh_token: string;
};

export type LogoutData = RefreshTokenData;

function register(data: RegisterData) {
  return customPost<RegisterData, AuthResponse>('/api/auth/register', data);
}

export const authApi = {
  register,
  signUp: register,

  login(data: LoginData) {
    return customPost<LoginData, AuthResponse>('/api/auth/login', data);
  },

  refresh(data: RefreshTokenData) {
    return customPost<RefreshTokenData, AuthResponse>('/api/auth/refresh', data);
  },

  logout(data: LogoutData) {
    return customPost<LogoutData, void>('/api/auth/logout', data);
  },

  me() {
    return customGet<AuthUser>('/api/auth/me');
  },
};

export type SignUpData = RegisterData;
