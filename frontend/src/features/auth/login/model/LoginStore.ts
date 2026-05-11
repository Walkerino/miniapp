import { makeAutoObservable, runInAction } from 'mobx';

import { authApi, saveAuthTokens } from 'api';
import { sessionStore } from 'entities/session';
import type { ILocalStore } from 'shared/lib/useLocalStore';

type FieldErrors = {
  form?: string;
  email?: string;
  password?: string;
};

export class LoginStore implements ILocalStore {
  private _email = '';
  private _password = '';
  private _success = false;
  private _errors: FieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setEmail(email: string) {
    this._email = email;
    this.clearErrors('email');
  }

  setPassword(password: string) {
    this._password = password;
    this.clearErrors('password');
  }

  clearErrors(field?: keyof FieldErrors) {
    if (field) {
      delete this._errors[field];
      return;
    }

    this._errors = {};
  }

  validate() {
    this._errors = {};

    if (!this._email) {
      this._errors.email = 'Email обязателен';
    } else if (!/^\S+@\S+\.\S+$/.test(this._email)) {
      this._errors.email = 'Некорректный email';
    }

    if (!this._password) {
      this._errors.password = 'Пароль обязателен';
    }

    return Object.keys(this._errors).length === 0;
  }

  async login() {
    if (!this.validate()) {
      return false;
    }

    const result = await authApi.login({
      email: this._email,
      password: this._password,
    });

    runInAction(() => {
      this._success = false;
    });

    if (result.isError && !result.status) {
      runInAction(() => {
        this._errors.form = 'Соединение не установлено';
      });
      return false;
    }

    if (result.isError && result.status === 401) {
      runInAction(() => {
        this._errors.form = 'Неверный email или пароль';
      });
      return false;
    }

    if (result.isError) {
      runInAction(() => {
        this._errors.form = 'Не удалось войти';
      });
      return false;
    }

    if (!result.data) {
      runInAction(() => {
        this._errors.form = 'Не удалось войти';
      });
      return false;
    }

    saveAuthTokens(result.data);

    runInAction(() => {
      sessionStore.setAuth();
      this._success = true;
    });

    return true;
  }

  get success() {
    return this._success;
  }

  get email() {
    return this._email;
  }

  get password() {
    return this._password;
  }

  get errors() {
    return this._errors;
  }

  get canSubmit() {
    return Boolean(this._email && this._password);
  }

  destroy() {
    this._email = '';
    this._password = '';
    this._errors = {};
    this._success = false;
  }
}
