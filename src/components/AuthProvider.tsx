"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  api,
  clearSession,
  getStoredPermissions,
  getStoredUser,
  getToken,
  savePermissions,
} from "@/lib/apiClient";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  country: "INDIA" | "AMERICA" | null;
}

interface AuthState {
  user: SessionUser | null;
  permissions: string[];
  can: (perm: string) => boolean;
  loading: boolean;
  refresh: () => void;
  /** Re-read the session from storage (call right after login). */
  syncFromStorage: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// Public routes that don't require a session.
const PUBLIC_ROUTES = new Set(["/login", "/"]);

/**
 * App-wide authentication provider.
 *
 * Mounted ONCE at the root, so navigating between pages does not re-run the
 * auth check — the biggest win for navigation speed. It hydrates synchronously
 * from localStorage (instant, no flash) and revalidates against `/api/auth/me`
 * in the background, so a stale/expired token is still caught.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Revalidate the session against the server; update or clear as needed.
  const refresh = useCallback(() => {
    if (!getToken()) return;
    api<{ user: SessionUser; permissions: string[] }>("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        setPermissions(data.permissions);
        savePermissions(data.permissions);
      })
      .catch((err) => {
        // Only drop the session on an auth failure, not on transient errors.
        if ((err as { status?: number }).status === 401) {
          clearSession();
          setUser(null);
          setPermissions([]);
        }
      });
  }, []);

  // Read whatever session is in storage into state (synchronous, no network).
  const syncFromStorage = useCallback(() => {
    if (getToken()) {
      setUser(getStoredUser<SessionUser>());
      setPermissions(getStoredPermissions());
    } else {
      setUser(null);
      setPermissions([]);
    }
  }, []);

  // 1) Hydrate instantly from localStorage on first mount, then
  // 2) revalidate against the server in the background (once).
  useEffect(() => {
    syncFromStorage();
    setHydrated(true);
    refresh();
  }, [syncFromStorage, refresh]);

  // Redirect to /login only after we know there's no session, and only on
  // protected routes.
  useEffect(() => {
    if (!hydrated) return;
    if (!user && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
    }
  }, [hydrated, user, pathname, router]);

  const value: AuthState = {
    user,
    permissions,
    can: (perm: string) => permissions.includes(perm),
    // "loading" is true only during the very first hydration tick; subsequent
    // navigations read the already-populated context and render immediately.
    loading: !hydrated,
    refresh,
    syncFromStorage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
