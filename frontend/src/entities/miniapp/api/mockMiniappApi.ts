import type { ApiAnswer } from 'api';
import type {
  AuthUser,
  FavoriteResponse,
  LaunchMiniappResponse,
  Miniapp,
  MiniappFormData,
  MiniappListParams,
  MiniappListResponse,
  UserRole,
} from 'entities/miniapp/model/types';

const now = '2026-05-11T11:42:53.725Z';

const mockUserId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

const mockItems: Miniapp[] = [
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    title: 'Weather App',
    description: 'Miniapp for weather forecast',
    url: 'https://example.com/weather',
    category: 'Utilities & Lifestyle',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 42,
    is_favorite: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b14',
    title: 'Tasks Board',
    description: 'Miniapp for daily tasks',
    url: 'https://example.com/tasks',
    category: 'Business & Productivity',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 18,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b15',
    title: 'Board 3',
    description: 'Miniapp for daily tasks',
    url: 'https://example.com/tasks',
    category: 'Business & Productivity',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 18,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b16',
    title: 'Board 4',
    description: 'Miniapp for daily tasks',
    url: 'https://example.com/tasks',
    category: 'Entertainment & Media',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 18,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b17',
    title: 'Tasks Board',
    description: 'Miniapp for daily tasks',
    url: 'https://example.com/tasks',
    category: 'Business & Productivity',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 18,
    is_favorite: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b18',
    title: 'Board 3',
    description: 'Miniapp for daily tasks',
    url: 'https://example.com/tasks',
    category: 'Education',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 18,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b19',
    title: 'Board 4',
    description: 'Miniapp for daily tasks',
    url: 'https://example.com/tasks',
    category: 'Entertainment & Media',
    status: 'active',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 18,
    is_favorite: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b20',
    title: 'Expense Review',
    description: 'Pending finance miniapp',
    url: 'https://example.com/expenses',
    category: 'Finance',
    status: 'pending',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 0,
    is_favorite: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b21',
    title: 'Legacy Reports',
    description: 'Temporarily disabled reporting miniapp',
    url: 'https://example.com/reports',
    category: 'Finance',
    status: 'disabled',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 7,
    is_favorite: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: '882d9079-59bf-4c23-9f10-8a48df5f0b22',
    title: 'Deleted App',
    description: 'This item should not be visible on the MiniApps page',
    url: 'https://example.com/deleted',
    category: 'Utilities & Lifestyle',
    status: 'deleted',
    created_by: mockUserId,
    updated_by: mockUserId,
    launches_count: 0,
    is_favorite: false,
    created_at: now,
    updated_at: now,
  },
];

function getMockRole(): UserRole {
  return import.meta.env.VITE_MOCK_USER_ROLE === 'admin' ? 'admin' : 'user';
}

function getMockUser(): AuthUser {
  return {
    id: mockUserId,
    email: 'user@example.com',
    name: 'Mock User',
    role: getMockRole(),
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function filterMiniapps(items: Miniapp[], params: MiniappListParams) {
  const search = params.search?.trim().toLowerCase();

  return items.filter((item) => {
    const matchesStatus = params.status ? item.status === params.status : true;
    const matchesSearch = search
      ? item.title.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      : true;

    return matchesStatus && matchesSearch;
  });
}

function createMockId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function setMockMiniappStatus(id: string, status: Miniapp['status']): ApiAnswer<Miniapp> {
  const itemIndex = mockItems.findIndex((miniapp) => miniapp.id === id);

  if (itemIndex === -1) {
    return {
      isError: true,
      status: 404,
    };
  }

  const updatedItem: Miniapp = {
    ...mockItems[itemIndex],
    status,
    updated_by: mockUserId,
    updated_at: now,
  };

  mockItems[itemIndex] = updatedItem;

  return {
    isError: false,
    status: 200,
    data: updatedItem,
  };
}

export const mockMiniappApi = {
  async getCurrentUser(): Promise<ApiAnswer<AuthUser>> {
    return {
      isError: false,
      status: 200,
      data: getMockUser(),
    };
  },

  async getMiniapps(params: MiniappListParams = {}): Promise<ApiAnswer<MiniappListResponse>> {
    const user = getMockUser();
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const roleItems =
      user.role === 'admin' ? mockItems : mockItems.filter((item) => item.status === 'active');
    const filteredItems = filterMiniapps(roleItems, params);
    const startIndex = (page - 1) * limit;
    const pageItems = filteredItems.slice(startIndex, startIndex + limit);

    return {
      isError: false,
      status: 200,
      data: {
        items: pageItems,
        page,
        limit,
        total: filteredItems.length,
      },
    };
  },

  async getMiniappById(id: string): Promise<ApiAnswer<Miniapp>> {
    const item = mockItems.find((miniapp) => miniapp.id === id);

    if (!item) {
      return {
        isError: true,
        status: 404,
      };
    }

    return {
      isError: false,
      status: 200,
      data: item,
    };
  },

  async createMiniapp(data: MiniappFormData): Promise<ApiAnswer<Miniapp>> {
    const createdItem: Miniapp = {
      id: createMockId(),
      title: data.title,
      description: data.description,
      url: data.url,
      category: data.category,
      status: data.status,
      created_by: mockUserId,
      updated_by: null,
      launches_count: 0,
      is_favorite: false,
      created_at: now,
      updated_at: now,
    };

    mockItems.unshift(createdItem);

    return {
      isError: false,
      status: 201,
      data: createdItem,
    };
  },

  async updateMiniapp(id: string, data: MiniappFormData): Promise<ApiAnswer<Miniapp>> {
    const itemIndex = mockItems.findIndex((miniapp) => miniapp.id === id);

    if (itemIndex === -1) {
      return {
        isError: true,
        status: 404,
      };
    }

    const updatedItem: Miniapp = {
      ...mockItems[itemIndex],
      title: data.title,
      description: data.description,
      url: data.url,
      category: data.category,
      status: data.status,
      updated_by: mockUserId,
      updated_at: now,
    };

    mockItems[itemIndex] = updatedItem;

    return {
      isError: false,
      status: 200,
      data: updatedItem,
    };
  },

  async deleteMiniapp(id: string): Promise<ApiAnswer<void>> {
    const itemIndex = mockItems.findIndex((miniapp) => miniapp.id === id);

    if (itemIndex === -1) {
      return {
        isError: true,
        status: 404,
      };
    }

    mockItems.splice(itemIndex, 1);

    return {
      isError: false,
      status: 204,
    };
  },

  async publishMiniapp(id: string): Promise<ApiAnswer<Miniapp>> {
    return setMockMiniappStatus(id, 'active');
  },

  async disableMiniapp(id: string): Promise<ApiAnswer<Miniapp>> {
    return setMockMiniappStatus(id, 'disabled');
  },

  async enableMiniapp(id: string): Promise<ApiAnswer<Miniapp>> {
    return setMockMiniappStatus(id, 'active');
  },

  async addFavorite(id: string): Promise<ApiAnswer<FavoriteResponse>> {
    const item = mockItems.find((miniapp) => miniapp.id === id);

    if (!item) {
      return {
        isError: true,
        status: 404,
      };
    }

    item.is_favorite = true;

    return {
      isError: false,
      status: 201,
      data: {
        user_id: mockUserId,
        miniapp_id: id,
        created_at: now,
      },
    };
  },

  async removeFavorite(id: string): Promise<ApiAnswer<void>> {
    const item = mockItems.find((miniapp) => miniapp.id === id);

    if (!item) {
      return {
        isError: true,
        status: 404,
      };
    }

    item.is_favorite = false;

    return {
      isError: false,
      status: 204,
    };
  },

  async launchMiniapp(id: string): Promise<ApiAnswer<LaunchMiniappResponse>> {
    const item = mockItems.find((miniapp) => miniapp.id === id);

    if (!item) {
      return {
        isError: true,
        status: 404,
      };
    }

    return {
      isError: false,
      status: 200,
      data: {
        launch_url: item.url,
        launch_token: 'mock-launch-token',
        expires_at: now,
      },
    };
  },
};
