const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
const TOKEN_KEY = "task_manager_token";

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token && !options.skipAuth) {
    headers.set("Authorization", `Token ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearToken();
    }
    let message = "Request failed";
    try {
      const payload = await response.json();
      message = payload.detail || JSON.stringify(payload);
    } catch {
      message = response.statusText;
    }
    throw new Error(message);
  }

  return response.json();
}
