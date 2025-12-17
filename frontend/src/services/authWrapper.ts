// src/services/authWrapper.ts
import { User } from '@/types';

/* =========================================================
   Types
========================================================= */

export interface RegisterPayload {
  username: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string; // access token
}

/* =========================================================
   Config
========================================================= */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

const ACCESS_KEY = 'auth_token';
const REFRESH_KEY = 'refresh_token';
const ACCESS_EXPIRES_AT_KEY = 'auth_token_expires_at'; // ms since epoch

/* =========================================================
   Time helpers
========================================================= */

function nowMs(): number {
  return Date.now();
}

/* =========================================================
   Storage helpers (single source of truth)
========================================================= */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function saveTokens(
  accessToken: string,
  refreshToken?: string,
  expiresInSeconds?: number
) {
  if (!isBrowser()) return;

  localStorage.setItem(ACCESS_KEY, accessToken);

  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  if (expiresInSeconds) {
    const expiresAt = nowMs() + expiresInSeconds * 1000;
    localStorage.setItem(ACCESS_EXPIRES_AT_KEY, String(expiresAt));
  }
}

function clearTokens() {
  if (!isBrowser()) return;

  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
}

function getAccessToken(): string | null {
  return isBrowser() ? localStorage.getItem(ACCESS_KEY) : null;
}

function getRefreshToken(): string | null {
  return isBrowser() ? localStorage.getItem(REFRESH_KEY) : null;
}

function getAccessExpiresAt(): number | null {
  if (!isBrowser()) return null;
  const v = localStorage.getItem(ACCESS_EXPIRES_AT_KEY);
  return v ? Number(v) : null;
}

/* =========================================================
   JWT helpers
========================================================= */

function base64UrlDecode(input: string): string | null {
  try {
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = input.length % 4;
    if (pad) input += '='.repeat(4 - pad);

    if (typeof window !== 'undefined' && window.atob) {
      return decodeURIComponent(
        Array.prototype.map
          .call(window.atob(input), (c: string) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
    }

    return Buffer.from(input, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): any | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = base64UrlDecode(payload);
    return decoded ? JSON.parse(decoded) : null;
  } catch {
    return null;
  }
}

function userFromAccessToken(token: string): User {
  const payload = decodeJwtPayload(token) || {};

  return {
    id: payload.sub ?? String(payload.id ?? ''),
    username: payload.username ?? payload.sub ?? '',
    avatar_url: payload.avatar_url ?? null,
  };
}

/* =========================================================
   HTTP helpers
========================================================= */

export async function handleJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  let json: any = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unexpected non-JSON response: ${text}`);
  }

  if (!res.ok) {
    const msg =
      json.detail ||
      json.message ||
      json.error ||
      `Request failed (${res.status})`;

    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return json;
}

/* =========================================================
   Auth API
========================================================= */

export async function loginUser(
  payload: LoginPayload
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await handleJsonResponse(res);

  const accessToken: string = json.access_token;
  const refreshToken: string | undefined = json.refresh_token;
  const expiresIn: number | undefined = json.expires_in;

  if (!accessToken) {
    throw new Error('Login did not return access_token');
  }

  saveTokens(accessToken, refreshToken, expiresIn);

  return {
    user: userFromAccessToken(accessToken),
    token: accessToken,
  };
}

export async function refreshTokens(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const json = await handleJsonResponse(res);

  const accessToken: string = json.access_token;
  const newRefresh: string | undefined = json.refresh_token;
  const expiresIn: number | undefined = json.expires_in;

  if (!accessToken) {
    throw new Error('Refresh endpoint did not return access_token');
  }

  saveTokens(accessToken, newRefresh, expiresIn);
  return accessToken;
}

export async function logoutUser(): Promise<void> {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // ignore network errors
    }
  }

  clearTokens();
}

/* =========================================================
   Authenticated fetch with refresh + retry
========================================================= */

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const makeRequest = async (token?: string | null) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(input, { ...init, headers });
  };

  const accessToken = getAccessToken();
  let res = await makeRequest(accessToken);

  if (res.status !== 401) {
    return res;
  }

  // attempt refresh once
  try {
    const newAccess = await refreshTokens();
    return await makeRequest(newAccess);
  } catch (err: any) {
    clearTokens();
    err.code = 'AUTH_EXPIRED';
    throw err;
  }
}

/* =========================================================
   Session restoration (used on app startup)
========================================================= */

export async function restoreSessionIfPossible(): Promise<{
  user: User;
  token: string;
} | null> {
  const access = getAccessToken();
  const expiresAt = getAccessExpiresAt();

  if (access && expiresAt && nowMs() < expiresAt - 5000) {
    return {
      user: userFromAccessToken(access),
      token: access,
    };
  }

  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const newAccess = await refreshTokens();
    return {
      user: userFromAccessToken(newAccess),
      token: newAccess,
    };
  } catch {
    clearTokens();
    return null;
  }
}

/* =========================================================
   Registration
========================================================= */

export async function registerUser(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  await handleJsonResponse(res);

  // Register does not return tokens → login immediately
  return loginUser({
    username: payload.username,
    password: payload.password,
  });
}
