/// <reference types="vite/client" />

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const TOKEN_KEY = 'bakery_jwt_token';
const USER_KEY = 'bakery_auth_user';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  name?: string;
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): AuthUser | null => {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: AuthUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export class ApiError extends Error {
  status: number;
  data: any;
  isNetworkError: boolean;

  constructor(status: number, message: string, data?: any, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers = {}, ...rest } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });
  } catch (networkErr: any) {
    throw new ApiError(
      0,
      'Unable to connect to backend server. The service may be waking up.',
      networkErr,
      true
    );
  }

  // Handle unauthorized (expired/invalid token)
  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  let responseData: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const message =
      (responseData && typeof responseData === 'object' && responseData.message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, responseData, false);
  }

  return responseData as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
