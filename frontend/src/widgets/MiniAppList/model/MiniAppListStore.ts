import { makeAutoObservable, runInAction } from 'mobx';

import { miniappApi } from 'entities/miniapp';
import type { Miniapp, MiniappCardData, MiniappListParams, UserRole } from 'entities/miniapp';
import type { ILocalStore } from 'shared/lib/useLocalStore';

type AdminStatusAction = 'publish' | 'disable' | 'enable';

export class MiniAppListStore implements ILocalStore {
  private _items: Miniapp[] = [];
  private _isLoading = false;
  private _error: string | null = null;
  private _currentUserRole: UserRole | null = null;
  private _statusActionIds = new Set<string>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(params: MiniappListParams = {}) {
    runInAction(() => {
      this._isLoading = true;
      this._error = null;
    });

    const [currentUserResponse, response] = await Promise.all([
      miniappApi.getCurrentUser(),
      miniappApi.getMiniapps(params),
    ]);

    runInAction(() => {
      this._isLoading = false;
      this._currentUserRole = currentUserResponse.data?.role ?? null;

      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to load miniapps';
        return;
      }

      this._items = response.data.items;
    });
  }

  async updateStatus(id: string, action: AdminStatusAction) {
    runInAction(() => {
      this._statusActionIds.add(id);
      this._error = null;
    });

    const response =
      action === 'publish'
        ? await miniappApi.publishMiniapp(id)
        : action === 'disable'
          ? await miniappApi.disableMiniapp(id)
          : await miniappApi.enableMiniapp(id);

    runInAction(() => {
      this._statusActionIds.delete(id);

      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to update miniapp status';
        return;
      }

      const updatedMiniapp = response.data;

      this._items = this._items.map((currentItem) =>
        currentItem.id === id ? updatedMiniapp : currentItem
      );
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

  async updateMiniappDetails(id: string, title: string, description: string, url: string) {
    const item = this._items.find((currentItem) => currentItem.id === id);

    if (!item) {
      return;
    }

    const response = await miniappApi.updateMiniapp(id, {
      title,
      description,
      url,
      status: item.status,
    });

    runInAction(() => {
      if (response.isError || !response.data) {
        this._error = response.errorMessage ?? 'Failed to update miniapp';
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
    return this._items.filter((item) => item.status !== 'deleted');
  }

  get isLoading() {
    return this._isLoading;
  }

  get error() {
    return this._error;
  }

  get isAdmin() {
    return this._currentUserRole === 'admin';
  }

  isStatusUpdating(id: string) {
    return this._statusActionIds.has(id);
  }

  destroy() {
    this._items = [];
    this._isLoading = false;
    this._error = null;
    this._currentUserRole = null;
    this._statusActionIds.clear();
  }
}
