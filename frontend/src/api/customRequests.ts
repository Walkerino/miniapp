import { BASE_URL } from './config';
import { getAccessToken } from './tokenStorage';

export type ApiAnswer<T> = {
  isError: boolean;
  data?: T;
  status?: number;
  errorMessage?: string;
};

const AUTHLESS_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
]);

function getApiUrl(path: string) {
  const baseUrl = BASE_URL.replace(/\/$/, '');

  if (baseUrl.endsWith('/api') && path.startsWith('/api/')) {
    return `${baseUrl}${path.slice('/api'.length)}`;
  }

  return `${baseUrl}${path}`;
}

async function parseResponseData<T>(response: Response) {
  const responseText = await response.text();

  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

function getAuthorizationHeaders(path: string) {
  if (AUTHLESS_PATHS.has(path)) {
    return undefined;
  }

  const accessToken = getAccessToken();

  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export async function customGet<T>(path: string): Promise<ApiAnswer<T>> {
  try {
    const authorizationHeaders = getAuthorizationHeaders(path);
    const response = await fetch(getApiUrl(path), {
      credentials: 'include',
      headers: authorizationHeaders,
    });

    const status = response.status;

    if (!response.ok) {
      return {
        isError: true,
        status,
      };
    }

    const data = await parseResponseData<T>(response);

    return {
      isError: false,
      status,
      data,
    };
  } catch (err) {
    const error = err as Error;

    return {
      isError: true,
      errorMessage: error.message,
    };
  }
}

export async function customPost<TBody, TResponse>(
  path: string,
  data?: TBody
): Promise<ApiAnswer<TResponse>> {
  try {
    const authorizationHeaders = getAuthorizationHeaders(path);
    const response = await fetch(getApiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...authorizationHeaders,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });

    const status = response.status;

    if (!response.ok) {
      return {
        isError: true,
        status,
      };
    }

    const responseData = await parseResponseData<TResponse>(response);

    return {
      isError: false,
      status,
      data: responseData,
    };
  } catch (err) {
    const error = err as Error;

    return {
      isError: true,
      errorMessage: error.message,
    };
  }
}

export async function customPatch<TBody, TResponse>(
  path: string,
  data: TBody
): Promise<ApiAnswer<TResponse>> {
  try {
    const authorizationHeaders = getAuthorizationHeaders(path);
    const response = await fetch(getApiUrl(path), {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authorizationHeaders,
      },
      body: JSON.stringify(data),
    });

    const status = response.status;

    if (!response.ok) {
      return {
        isError: true,
        status,
      };
    }

    const responseData = await parseResponseData<TResponse>(response);

    return {
      isError: false,
      status,
      data: responseData,
    };
  } catch (err) {
    const error = err as Error;

    return {
      isError: true,
      errorMessage: error.message,
    };
  }
}
