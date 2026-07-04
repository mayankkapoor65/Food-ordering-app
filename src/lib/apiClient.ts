"use client";

// Thin client-side wrapper around fetch that attaches the JWT, unwraps the
// standard { success, data, error } envelope, and caches GET responses in
// memory so returning to a page renders instantly while it revalidates.

const TOKEN_KEY = "foa_token";
const USER_KEY = "foa_user";
const PERMS_KEY = "foa_perms";

export function saveSession(token: string, user: unknown, permissions?: string[]) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (permissions) localStorage.setItem(PERMS_KEY, JSON.stringify(permissions));
}

export function savePermissions(permissions: string[]) {
  localStorage.setItem(PERMS_KEY, JSON.stringify(permissions));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERMS_KEY);
  dataCache.clear();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser<T = any>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function getStoredPermissions(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PERMS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

// ---- In-memory GET cache (per session, cleared on logout/reload) ----
const dataCache = new Map<string, unknown>();

/** Synchronously read the last cached payload for a GET path (or null). */
export function getCached<T = any>(path: string): T | null {
  return (dataCache.get(path) as T) ?? null;
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const method = (options.method || "GET").toUpperCase();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    // Error envelope: { success:false, error:{ code, message, details? } }
    const message =
      json?.error?.message ||
      (typeof json?.error === "string" ? json.error : "") ||
      `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  // Cache successful reads so subsequent visits can render instantly.
  if (method === "GET") dataCache.set(path, json.data);
  return json.data as T;
}
