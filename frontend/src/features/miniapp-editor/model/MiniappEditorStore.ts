import { makeAutoObservable, runInAction } from 'mobx';

import { miniappApi } from 'entities/miniapp';
import type { MiniappFormData } from 'entities/miniapp';
import type { ILocalStore } from 'shared/lib/useLocalStore';
import type { StatusType } from 'shared/types';

const emptyForm: MiniappFormData = {
  title: '',
  description: '',
  url: '',
  status: 'pending',
};

export class MiniappEditorStore implements ILocalStore {
  private _form: MiniappFormData = emptyForm;
  private _isLoading = false;
  private _isSaving = false;
  private _isSaved = false;
  private _error: string | null = null;
  private _miniappId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(miniappId?: string) {
    runInAction(() => {
      this._miniappId = miniappId ?? null;
      this._isSaved = false;
      this._error = null;
    });

    if (!miniappId) {
      runInAction(() => {
        this._form = { ...emptyForm };
      });
      return;
    }

    runInAction(() => {
      this._isLoading = true;
    });

    const response = await miniappApi.getMiniappById(miniappId);

    runInAction(() => {
      this._isLoading = false;

      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to load miniapp';
        return;
      }

      const { title, description, url, status } = response.data;
      this._form = {
        title,
        description: description ?? '',
        url,
        status,
      };
    });
  }

  setTitle(title: string) {
    this._form = { ...this._form, title };
    this._isSaved = false;
  }

  setDescription(description: string) {
    this._form = { ...this._form, description };
    this._isSaved = false;
  }

  setUrl(url: string) {
    this._form = { ...this._form, url };
    this._isSaved = false;
  }

  setStatus(status: StatusType) {
    this._form = { ...this._form, status };
    this._isSaved = false;
  }

  async submit() {
    runInAction(() => {
      this._isSaving = true;
      this._isSaved = false;
      this._error = null;
    });

    const response = this._miniappId
      ? await miniappApi.updateMiniapp(this._miniappId, this._form)
      : await miniappApi.createMiniapp(this._form);

    runInAction(() => {
      this._isSaving = false;

      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to save miniapp';
        return;
      }

      this._miniappId = response.data.id;
      this._form = {
        title: response.data.title,
        description: response.data.description ?? '',
        url: response.data.url,
        status: response.data.status,
      };
      this._isSaved = true;
    });
  }

  get form() {
    return this._form;
  }

  get isCreateMode() {
    return !this._miniappId;
  }

  get isLoading() {
    return this._isLoading;
  }

  get isSaving() {
    return this._isSaving;
  }

  get isSaved() {
    return this._isSaved;
  }

  get error() {
    return this._error;
  }

  get canSubmit() {
    return Boolean(this._form.title.trim() && this._form.url.trim());
  }

  destroy() {
    this._form = { ...emptyForm };
    this._isLoading = false;
    this._isSaving = false;
    this._isSaved = false;
    this._error = null;
    this._miniappId = null;
  }
}
