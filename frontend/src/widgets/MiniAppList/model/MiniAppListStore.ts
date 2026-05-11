import { makeAutoObservable, runInAction } from 'mobx';

import { miniappApi } from 'entities/miniapp';
import type { MiniappCardData, MiniappListParams } from 'entities/miniapp';
import type { ILocalStore } from 'shared/lib/useLocalStore';

export class MiniAppListStore implements ILocalStore {
  private _items: MiniappCardData[] = [];
  private _isLoading = false;
  private _error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(params: MiniappListParams = {}) {
    runInAction(() => {
      this._isLoading = true;
      this._error = null;
    });

    const response = await miniappApi.getMiniapps(params);

    runInAction(() => {
      this._isLoading = false;

      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to load miniapps';
        return;
      }

      this._items = response.data.items.map(
        ({ id, title, description, url, status, is_favorite }) => ({
          id,
          title,
          description,
          url,
          status,
          is_favorite,
        })
      );
    });
  }

  toggleFavorite(id: string) {
    this._items = this._items.map((item) =>
      item.id === id ? { ...item, is_favorite: !item.is_favorite } : item
    );
  }

  get items() {
    return this._items;
  }

  get isLoading() {
    return this._isLoading;
  }

  get error() {
    return this._error;
  }

  destroy() {
    this._items = [];
    this._isLoading = false;
    this._error = null;
  }
}
