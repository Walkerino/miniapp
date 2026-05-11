import { makeAutoObservable, runInAction } from 'mobx';

import { authApi, clearAuthTokens, getRefreshToken, saveAuthTokens } from 'api';
import type { UserData } from 'entities/user';

export class SessionStore {
  private _isAuth = false;
  private _userData: UserData | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setAuth(userData: UserData | null = null) {
    this._isAuth = true;
    this._userData = userData;
  }

  async checkAuth() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      runInAction(() => {
        this._isAuth = false;
        this._userData = null;
      });
      return;
    }

    const response = await authApi.refresh({ refresh_token: refreshToken });

    if (response.isError || !response.data) {
      clearAuthTokens();
      runInAction(() => {
        this._isAuth = false;
        this._userData = null;
      });
      return;
    }

    saveAuthTokens(response.data);

    runInAction(() => {
      this.setAuth();
    });
  }

  logout() {
    clearAuthTokens();
    this._userData = null;
    this._isAuth = false;
  }

  get isAuth() {
    return this._isAuth;
  }

  get userData() {
    return this._userData;
  }

  get fullName() {
    if (!this._userData) {
      return '';
    }

    return `${this._userData.lastName} ${this._userData.firstName} ${this._userData.middleName}`.trim();
  }

  destroy() {
    clearAuthTokens();
    this._isAuth = false;
    this._userData = null;
  }
}

export const sessionStore = new SessionStore();
