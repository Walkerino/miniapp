import { makeAutoObservable, runInAction } from 'mobx';

import { getAccessToken } from 'api';
import { BASE_URL } from 'api/config';
import { miniappApi } from 'entities/miniapp';
import type { Miniapp, MiniappCardData, MiniappListParams, UserRole } from 'entities/miniapp';
import type { ILocalStore } from 'shared/lib/useLocalStore';
import type { StatusType } from 'shared/types';

const DEFAULT_PAGE_LIMIT = 20;

function getPlatformApiBase() {
  if (BASE_URL) {
    return BASE_URL;
  }

  return typeof window === 'undefined' ? '' : window.location.origin;
}

function withSsoParams(url: string) {
  try {
    const launchUrl = new URL(url, window.location.href);
    const accessToken = getAccessToken();
    const apiBase = getPlatformApiBase();

    if (accessToken) {
      launchUrl.searchParams.set('access_token', accessToken);
    }

    if (apiBase) {
      launchUrl.searchParams.set('api_base', apiBase);
      launchUrl.searchParams.set('platform_origin', apiBase);
    }

    return launchUrl.toString();
  } catch {
    return url;
  }
}

type AdminStatusAction = 'publish' | 'disable' | 'enable';

export class MiniAppListStore implements ILocalStore {
  private _items: Miniapp[] = [];
  private _isLoading = false;
  private _isLoadingMore = false;
  private _error: string | null = null;
  private _currentUserRole: UserRole | null = null;
  private _statusActionIds = new Set<string>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load(params: MiniappListParams = {}) {
    const page = params.page ?? 1;
    const isLoadingMore = page > 1;
    const requestParams: MiniappListParams = {
      page,
      limit: params.limit ?? this._limit,
    };

    if ('status' in params) {
      this._status = params.status;
    }

    if (this._status) {
      requestParams.status = this._status;
    }

    runInAction(() => {
      this._isLoading = !isLoadingMore;
      this._isLoadingMore = isLoadingMore;
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

      this._items = isLoadingMore
        ? [...this._items, ...response.data.items]
        : response.data.items;
      this._page = response.data.page;
      this._limit = response.data.limit;
      this._total = response.data.total;
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
      this._total = Math.max(this._total - ids.length, 0);
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

    window.open(withSsoParams(response.data.launch_url), '_blank', 'noopener,noreferrer');
  }

  async getMiniappLaunchUrl(id: string) {
    const response = await miniappApi.launchMiniapp(id);

    if (response.isError || !response.data) {
      runInAction(() => {
        this._error = response.errorMessage ?? 'Failed to launch miniapp';
      });
      return null;
    }

    return withSsoParams(response.data.launch_url);
  }

  get items(): MiniappCardData[] {
    return this._items.filter((item) => item.status !== 'deleted');
  }

  get isLoading() {
    return this._isLoading;
  }

  get isLoadingMore() {
    return this._isLoadingMore;
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
    this._isLoadingMore = false;
    this._error = null;
    this._currentUserRole = null;
    this._statusActionIds.clear();
  }
}
