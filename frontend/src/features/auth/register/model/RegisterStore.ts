import { makeAutoObservable, runInAction } from 'mobx';

import { authApi } from 'api';
import { sessionStore } from 'entities/session';
import type { ILocalStore } from 'shared/lib/useLocalStore';

type FieldErrors = {
  form?: string;
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export class RegisterStore implements ILocalStore {
  private _name = '';
  private _email = '';
  private _password = '';
  private _confirmPassword = '';
  private _success = false;
  private _errors: FieldErrors = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setName(name: string) {
    this._name = name;
    this.clearErrors('name');
  }

  setEmail(email: string) {
    this._email = email;
    this.clearErrors('email');
  }

  setPassword(password: string) {
    this._password = password;
    this.clearErrors('password');
  }

  setConfirmPassword(confirmPassword: string) {
    this._confirmPassword = confirmPassword;
    this.clearErrors('confirmPassword');
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

    if (!this._name.trim()) {
      this._errors.name = 'Name is required';
    }

    if (!this._email) {
      this._errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(this._email)) {
      this._errors.email = 'Invalid email';
    }

    if (!this._password) {
      this._errors.password = 'Password is required';
    } else if (this._password.length < 6) {
      this._errors.password = 'Minimum 6 characters';
    }

    if (!this._confirmPassword) {
      this._errors.confirmPassword = 'Confirm password';
    } else if (this._password !== this._confirmPassword) {
      this._errors.confirmPassword = 'Passwords do not match';
    }

    return Object.keys(this._errors).length === 0;
  }

  async signUp() {
    if (!this.validate()) {
      return false;
    }

    const result = await authApi.register({
      name: this._name.trim(),
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

    if (result.isError && (result.status === 400 || result.status === 409)) {
      runInAction(() => {
        this._errors.form = 'User already exists';
      });
      return false;
    }

    if (result.isError) {
      runInAction(() => {
        this._errors.form = 'Could not register';
      });
      return false;
    }

    if (!result.data) {
      runInAction(() => {
        this._errors.form = 'Could not register';
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

  get name() {
    return this._name;
  }

  get email() {
    return this._email;
  }

  get password() {
    return this._password;
  }

  get confirmPassword() {
    return this._confirmPassword;
  }

  get errors() {
    return this._errors;
  }

  get canSubmit() {
    return Boolean(this._name && this._email && this._password && this._confirmPassword);
  }

  destroy() {
    this._name = '';
    this._email = '';
    this._password = '';
    this._confirmPassword = '';
    this._errors = {};
    this._success = false;
  }
}
