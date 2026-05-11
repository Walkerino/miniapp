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

export type UserData = AuthUser;
