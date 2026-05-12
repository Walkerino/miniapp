import { customDelete, customGet, customPatch } from 'api';
import type { UserData } from 'entities/user/model/types';

export type UpdateNameData = {
  name: string;
};

export type UpdateEmailData = {
  email: string;
  current_password: string;
};

export type UpdatePasswordData = {
  current_password: string;
  new_password: string;
};

export type DeleteAccountData = {
  current_password: string;
};

export const userApi = {
  me() {
    return customGet<UserData>('/api/auth/me');
  },

  updateName(data: UpdateNameData) {
    return customPatch<UpdateNameData, UserData>('/api/auth/me/name', data);
  },

  updateEmail(data: UpdateEmailData) {
    return customPatch<UpdateEmailData, UserData>('/api/auth/me/email', data);
  },

  updatePassword(data: UpdatePasswordData) {
    return customPatch<UpdatePasswordData, UserData>('/api/auth/me/password', data);
  },

  deleteAccount(data: DeleteAccountData) {
    return customDelete<void, DeleteAccountData>('/api/auth/me', data);
  },
};
