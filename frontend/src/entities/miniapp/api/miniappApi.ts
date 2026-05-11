import { customDelete, customGet, customPatch, customPost } from 'api';
import type { ApiAnswer } from 'api';
import { mockMiniappApi } from 'entities/miniapp/api/mockMiniappApi';
import type {
  AuthUser,
  CreateMiniappRequest,
  FavoriteResponse,
  LaunchMiniappResponse,
  Miniapp,
  MiniappFormData,
  MiniappListParams,
  MiniappListResponse,
  UpdateMiniappRequest,
  UserRole,
} from 'entities/miniapp/model/types';

const shouldUseMockMiniapps = import.meta.env.VITE_USE_MOCK_MINIAPPS === 'true';

function getMiniappsPath(role: UserRole) {
  return role === 'admin' ? '/api/admin/miniapps' : '/api/miniapps';
}

function getMiniappPath(role: UserRole, id: string) {
  return `${getMiniappsPath(role)}/${id}`;
}

function getAdminMiniappPath(id: string) {
  return `/api/admin/miniapps/${id}`;
}

function withQuery(path: string, params: MiniappListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

async function getCurrentUser(): Promise<ApiAnswer<AuthUser>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.getCurrentUser();
  }

  return customGet<AuthUser>('/api/auth/me');
}

async function getMiniapps(
  params: MiniappListParams = {}
): Promise<ApiAnswer<MiniappListResponse>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.getMiniapps(params);
  }

  const currentUserResponse = await getCurrentUser();

  if (currentUserResponse.isError || !currentUserResponse.data) {
    return {
      isError: true,
      status: currentUserResponse.status,
      errorMessage: currentUserResponse.errorMessage,
    };
  }

  const path = getMiniappsPath(currentUserResponse.data.role);

  return customGet<MiniappListResponse>(withQuery(path, params));
}

async function getMiniappById(id: string): Promise<ApiAnswer<Miniapp>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.getMiniappById(id);
  }

  const currentUserResponse = await getCurrentUser();

  if (currentUserResponse.isError || !currentUserResponse.data) {
    return {
      isError: true,
      status: currentUserResponse.status,
      errorMessage: currentUserResponse.errorMessage,
    };
  }

  return customGet<Miniapp>(getMiniappPath(currentUserResponse.data.role, id));
}

async function createMiniapp(data: MiniappFormData): Promise<ApiAnswer<Miniapp>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.createMiniapp(data);
  }

  const currentUserResponse = await getCurrentUser();

  if (currentUserResponse.isError || !currentUserResponse.data) {
    return {
      isError: true,
      status: currentUserResponse.status,
      errorMessage: currentUserResponse.errorMessage,
    };
  }

  const path = getMiniappsPath(currentUserResponse.data.role);
  const requestData: CreateMiniappRequest =
    currentUserResponse.data.role === 'admin'
      ? data
      : {
          title: data.title,
          description: data.description,
          url: data.url,
        };

  return customPost<CreateMiniappRequest, Miniapp>(path, requestData);
}

async function updateMiniapp(id: string, data: MiniappFormData): Promise<ApiAnswer<Miniapp>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.updateMiniapp(id, data);
  }

  const requestData: UpdateMiniappRequest = {
    title: data.title,
    description: data.description,
    url: data.url,
    status: data.status,
  };

  return customPatch<UpdateMiniappRequest, Miniapp>(getAdminMiniappPath(id), requestData);
}

async function deleteMiniapp(id: string): Promise<ApiAnswer<void>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.deleteMiniapp(id);
  }

  return customDelete<void>(getAdminMiniappPath(id));
}

async function addFavorite(id: string): Promise<ApiAnswer<FavoriteResponse>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.addFavorite(id);
  }

  return customPost<void, FavoriteResponse>(`/api/miniapps/${id}/favorite`, undefined);
}

async function removeFavorite(id: string): Promise<ApiAnswer<void>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.removeFavorite(id);
  }

  return customDelete<void>(`/api/miniapps/${id}/favorite`);
}

async function launchMiniapp(id: string): Promise<ApiAnswer<LaunchMiniappResponse>> {
  if (shouldUseMockMiniapps) {
    return mockMiniappApi.launchMiniapp(id);
  }

  return customPost<void, LaunchMiniappResponse>(`/api/miniapps/${id}/launch`, undefined);
}

export const miniappApi = {
  addFavorite,
  createMiniapp,
  deleteMiniapp,
  getCurrentUser,
  getMiniappById,
  getMiniapps,
  launchMiniapp,
  removeFavorite,
  updateMiniapp,
};
