import type { AuthResponse } from './authApi';

const AUTH_TOKENS_STORAGE_KEY = 'authTokens';

export type AuthTokens = AuthResponse;

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function isAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tokens = value as Partial<AuthTokens>;

  return (
    typeof tokens.access_token === 'string' &&
    typeof tokens.refresh_token === 'string' &&
    typeof tokens.expires_at === 'string'
  );
}

export function saveAuthTokens(tokens: AuthTokens) {
  try {
    getStorage()?.setItem(AUTH_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    clearAuthTokens();
  }
}

export function getAuthTokens() {
  try {
    const rawTokens = getStorage()?.getItem(AUTH_TOKENS_STORAGE_KEY);

    if (!rawTokens) {
      return null;
    }

    const tokens = JSON.parse(rawTokens) as unknown;

    return isAuthTokens(tokens) ? tokens : null;
  } catch {
    clearAuthTokens();
    return null;
  }
}

export function getAccessToken() {
  return getAuthTokens()?.access_token ?? null;
}

export function getRefreshToken() {
  return getAuthTokens()?.refresh_token ?? null;
}

export function hasAuthTokens() {
  return Boolean(getAccessToken());
}

export function clearAuthTokens() {
  try {
    getStorage()?.removeItem(AUTH_TOKENS_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}
