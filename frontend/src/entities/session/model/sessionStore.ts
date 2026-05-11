import { makeAutoObservable, runInAction } from 'mobx';

import { authApi, clearAuthTokens, getRefreshToken, saveAuthTokens } from 'api';
import type { AuthResponse } from 'api';
import type { AuthUser } from 'entities/user';

export class SessionStore {
  private _isAuth = false;
  private _user: AuthUser | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setSession(authResponse: AuthResponse) {
    saveAuthTokens(authResponse);
    this._isAuth = true;
    this._user = authResponse.user;
  }

  async checkAuth() {
    if (this._isAuth && this._user) {
      return true;
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      this.clearSession();
      return false;
    }

    const response = await authApi.refresh({ refresh_token: refreshToken });

    if (response.isError || !response.data) {
      this.clearSession();
      return false;
    }

    const authResponse = response.data;

    runInAction(() => {
      this.setSession(authResponse);
    });

    return true;
  }

  async logout() {
    const refreshToken = getRefreshToken();

    this.clearSession();

    if (refreshToken) {
      await authApi.logout({ refresh_token: refreshToken });
    }
  }

  clearSession() {
    clearAuthTokens();
    this._user = null;
    this._isAuth = false;
  }

  get isAuth() {
    return this._isAuth;
  }

  get user() {
    return this._user;
  }

  get userData() {
    return this._user;
  }

  get role() {
    return this._user?.role ?? null;
  }

  get userName() {
    return this._user?.name || this._user?.email || 'User';
  }

  get fullName() {
    return this.userName;
  }

  destroy() {
    this.clearSession();
  }
}

export const sessionStore = new SessionStore();
