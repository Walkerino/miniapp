import { makeAutoObservable, runInAction } from 'mobx';

import { miniappApi } from 'entities/miniapp';
import type { Miniapp, MiniappCardData, MiniappListParams } from 'entities/miniapp';
import type { ILocalStore } from 'shared/lib/useLocalStore';

export class MiniAppListStore implements ILocalStore {
  private _items: Miniapp[] = [];
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

      this._items = response.data.items;
    });
  }

  async toggleFavorite(id: string) {
    const item = this._items.find((currentItem) => currentItem.id === id);

    if (!item) {
      return;
    }

    const response = item.is_favorite
      ? await miniappApi.removeFavorite(id)
      : await miniappApi.addFavorite(id);

    runInAction(() => {
      if (response.isError) {
        this._error = response.errorMessage ?? 'Failed to update favorite';
        return;
      }

      this._items = this._items.map((currentItem) =>
        currentItem.id === id ? { ...currentItem, is_favorite: !currentItem.is_favorite } : currentItem
      );
    });
  }

  async renameMiniapp(id: string, title: string, description: string) {
    const item = this._items.find((currentItem) => currentItem.id === id);

    if (!item) {
      return;
    }

    const response = await miniappApi.updateMiniapp(id, {
      title,
      description,
      url: item.url,
      status: item.status,
    });

    runInAction(() => {
      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to rename miniapp';
        return;
      }

      const updatedMiniapp = response.data;

      this._items = this._items.map((currentItem) =>
        currentItem.id === id ? updatedMiniapp : currentItem
      );
    });
  }

  async deleteMiniapps(ids: string[]) {
    const responses = await Promise.all(ids.map((id) => miniappApi.deleteMiniapp(id)));
    const failedResponse = responses.find((response) => response.isError);

    if (failedResponse) {
      runInAction(() => {
        this._error = failedResponse.errorMessage ?? 'Failed to delete miniapps';
      });
      return;
    }

    const idSet = new Set(ids);

    runInAction(() => {
      this._items = this._items.filter((item) => !idSet.has(item.id));
    });
  }

  async launchMiniapp(id: string) {
    const response = await miniappApi.launchMiniapp(id);

    if (response.isError || !response.data) {
      runInAction(() => {
        this._error = response.errorMessage ?? 'Failed to launch miniapp';
      });
      return;
    }

    window.open(response.data.launch_url, '_blank', 'noopener,noreferrer');
  }

  async getMiniappLaunchUrl(id: string) {
    const response = await miniappApi.launchMiniapp(id);

    if (response.isError || !response.data) {
      runInAction(() => {
        this._error = response.errorMessage ?? 'Failed to launch miniapp';
      });
      return null;
    }

    return response.data.launch_url;
  }

  get items(): MiniappCardData[] {
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
