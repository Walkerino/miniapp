import { makeAutoObservable, runInAction } from 'mobx';


import { authApi, clearAuthTokens, getAccessToken, saveAuthTokens } from 'api';
import type { AuthResponse } from 'api';
import type { AuthUser } from 'entities/user';

export class SessionStore {
  private _isAuth = false;
  private _user: AuthUser | null = null;
  private _checkAuthPromise: Promise<boolean> | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setSession(authResponse: AuthResponse) {
    saveAuthTokens(authResponse);
    this._isAuth = true;
    this._user = authResponse.user;
  }

  setUser(user: AuthUser) {
    this._user = user;
    this._isAuth = true;
  }

  async checkAuth() {
    if (this._isAuth && this._user) {
      return true;
    }

    if (this._checkAuthPromise) {
      return this._checkAuthPromise;
    }

    this._checkAuthPromise = this.restoreSession();

    try {
      return await this._checkAuthPromise;
    } finally {
      this._checkAuthPromise = null;
    }
  }

  private async restoreSession() {
    if (getAccessToken()) {
      const meResponse = await authApi.me();

      if (!meResponse.isError && meResponse.data) {
        const user = meResponse.data;

        runInAction(() => {
          this._isAuth = true;
          this._user = user;
        });
        return true;
      }
    }

    return this.refreshSession();
  }

  private async refreshSession() {
    const response = await authApi.refresh();

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
    this.clearSession();
    await authApi.logout();
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
