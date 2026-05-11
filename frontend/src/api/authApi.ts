import { customPost } from './customRequests';

export type SignUpData = {
  email: string;
  password: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export type RefreshTokenData = {
  refresh_token: string;
};

export const authApi = {
  signUp(data: SignUpData) {
    return customPost<SignUpData, AuthResponse>('/register', data);
  },

  login(data: LoginData) {
    return customPost<LoginData, AuthResponse>('/login', data);
  },

  refresh(data: RefreshTokenData) {
    return customPost<RefreshTokenData, AuthResponse>('/refresh', data);
  },
};
