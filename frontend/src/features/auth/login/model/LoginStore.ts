import { makeAutoObservable, runInAction } from 'mobx';

import { authApi } from 'api';
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
      this._errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(this._email)) {
      this._errors.email = 'Invalid email';
    }

    if (!this._password) {
      this._errors.password = 'Password is required';
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
        this._errors.form = 'Connection failed';
      });
      return false;
    }

    if (result.isError && result.status === 401) {
      runInAction(() => {
        this._errors.form = 'Invalid email or password';
      });
      return false;
    }

    if (result.isError) {
      runInAction(() => {
        this._errors.form = 'Could not sign in';
      });
      return false;
    }

    if (!result.data) {
      runInAction(() => {
        this._errors.form = 'Could not sign in';
      });
      return false;
    }

    const authResponse = result.data;

    runInAction(() => {
      sessionStore.setSession(authResponse);
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
