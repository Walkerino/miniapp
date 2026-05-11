const AUTH_TOKENS_STORAGE_KEY = 'authTokens';

export type AuthTokens = {
  access_token: string;
};

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

  return typeof tokens.access_token === 'string';
}

export function saveAuthTokens(tokens: AuthTokens) {
  try {
    getStorage()?.setItem(
      AUTH_TOKENS_STORAGE_KEY,
      JSON.stringify({
        access_token: tokens.access_token,
      })
    );
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
