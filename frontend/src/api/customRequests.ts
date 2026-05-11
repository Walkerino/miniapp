import { BASE_URL } from './config';
import { getAccessToken } from './tokenStorage';

export type ApiAnswer<T> = {
  isError: boolean;
  data?: T;
  status?: number;
  errorMessage?: string;
};

const AUTHLESS_PATHS = new Set(['/login', '/register', '/refresh']);

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
    const response = await fetch(`${BASE_URL}${path}`, {
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

    const data = (await response.json()) as T;

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
  data: TBody
): Promise<ApiAnswer<TResponse>> {
  try {
    const authorizationHeaders = getAuthorizationHeaders(path);
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
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

    const responseData = (await response.json()) as TResponse;

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
