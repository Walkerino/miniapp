import { makeAutoObservable, runInAction } from 'mobx';

import { getAccessToken } from 'api';
import { BASE_URL } from 'api/config';
import { adminApi } from 'entities/admin';
import { miniappApi } from 'entities/miniapp';
import type { Miniapp, MiniappCardData, MiniappCategory, MiniappListParams, UserRole } from 'entities/miniapp';
import type { ILocalStore } from 'shared/lib/useLocalStore';
import type { StatusType } from 'shared/types';

const DEFAULT_PAGE_LIMIT = 20;
const OWNED_MINIAPPS_PAGE_LIMIT = 100;

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
  private _page = 1;
  private _limit = DEFAULT_PAGE_LIMIT;
  private _total = 0;
  private _status: StatusType | undefined;
  private _currentUserRole: UserRole | null = null;
  private _statusActionIds = new Set<string>();
  private _creatorNames = new Map<string, string>();

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

    const currentUserResponse = await miniappApi.getCurrentUser();

    if (currentUserResponse.isError || !currentUserResponse.data) {
      runInAction(() => {
        this._isLoading = false;
        this._isLoadingMore = false;
        this._currentUserRole = null;
        this._error = currentUserResponse.errorMessage ?? 'Failed to load current user';
      });
      return;
    }

    const currentUser = currentUserResponse.data;

    requestParams.limit = OWNED_MINIAPPS_PAGE_LIMIT;

    const response = await miniappApi.getMiniapps(requestParams);

    if (response.isError || !response.data) {
      runInAction(() => {
        this._isLoading = false;
        this._isLoadingMore = false;
        this._currentUserRole = currentUser.role;
        this._error = response.errorMessage ?? 'Failed to load miniapps';
      });
      return;
    }

    const pageCount = Math.ceil(response.data.total / response.data.limit);
    const pageResponses =
      pageCount > 1
        ? await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              miniappApi.getMiniapps({
                ...requestParams,
                page: index + 2,
              }),
            ),
          )
        : [];
    const failedPage = pageResponses.find((pageResponse) => pageResponse.isError || !pageResponse.data);

    if (failedPage) {
      runInAction(() => {
        this._isLoading = false;
        this._isLoadingMore = false;
        this._currentUserRole = currentUser.role;
        this._error = failedPage.errorMessage ?? 'Failed to load miniapps';
      });
      return;
    }

    const loadedItems = [
      ...response.data.items,
      ...pageResponses.flatMap((pageResponse) => pageResponse.data?.items ?? []),
    ];
    const visibleItems =
      currentUser.role === 'admin'
        ? loadedItems
        : loadedItems.filter((item) => item.created_by === currentUser.id);
    const usersResponse =
      currentUser.role === 'admin' ? await adminApi.getUsers('', 1000) : null;
    const creatorNames =
      usersResponse && !usersResponse.isError && usersResponse.data
        ? new Map(
            usersResponse.data.items.map((user) => [
              user.id,
              user.name || user.email,
            ])
          )
        : new Map<string, string>();

    runInAction(() => {
      this._isLoading = false;
      this._isLoadingMore = false;
      this._currentUserRole = currentUser.role;
      this._items = isLoadingMore ? [...this._items, ...visibleItems] : visibleItems;
      this._creatorNames = creatorNames;
      this._page = 1;
      this._limit = Math.max(visibleItems.length, 1);
      this._total = visibleItems.length;
    });
  }

  async loadNextPage() {
    if (!this.hasMore || this._isLoading || this._isLoadingMore) {
      return;
    }

    await this.load({ page: this._page + 1 });
  }

  async createMiniapp(title: string, description: string, url: string, category: MiniappCategory) {
    runInAction(() => {
      this._error = null;
    });

    const response = await miniappApi.createMiniapp({
      title,
      description,
      url,
      category,
      status: this.isAdmin ? 'active' : 'pending',
    });

    if (response.isError || !response.data) {
      runInAction(() => {
        this._error = response.errorMessage ?? 'Failed to create miniapp';
      });
      return false;
    }

    const createdMiniapp = response.data;

    runInAction(() => {
      this._status = undefined;
      this._items = [createdMiniapp, ...this._items.filter((item) => item.id !== createdMiniapp.id)];
      this._limit = Math.max(this._items.length, 1);
      this._total = this._items.length;
    });

    return true;
  }

  async generateMiniapp(prompt: string) {
    runInAction(() => {
      this._error = null;
    });

    const response = await miniappApi.generateMiniapp(prompt);

    if (response.isError || !response.data) {
      runInAction(() => {
        this._error = response.errorMessage ?? 'Failed to generate miniapp';
      });
      return false;
    }

    await this.load({ status: undefined });
    return true;
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

  async updateMiniappDetails(
    id: string,
    title: string,
    description: string,
    url: string,
    category: MiniappCategory
  ) {
    const item = this._items.find((currentItem) => currentItem.id === id);

    if (!item) {
      return;
    }

    const response = await miniappApi.updateMiniapp(id, {
      title,
      description,
      url,
      category,
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
      this._limit = Math.max(this._items.length, 1);
      this._total = this._items.length;
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
    return this.isAdmin ? this._items : this._items.filter((item) => item.status !== 'deleted');
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

  get page() {
    return this._page;
  }

  get pageCount() {
    return Math.max(Math.ceil(this._total / this._limit), 1);
  }

  get total() {
    return this._total;
  }

  get status() {
    return this._status;
  }

  get hasMore() {
    return this._page < this.pageCount;
  }

  isStatusUpdating(id: string) {
    return this._statusActionIds.has(id);
  }

  getCreatorName(id: string) {
    return this._creatorNames.get(id) ?? id;
  }

  destroy() {
    this._items = [];
    this._isLoading = false;
    this._isLoadingMore = false;
    this._error = null;
    this._page = 1;
    this._limit = DEFAULT_PAGE_LIMIT;
    this._total = 0;
    this._status = undefined;
    this._currentUserRole = null;
    this._statusActionIds.clear();
    this._creatorNames.clear();
  }
}
