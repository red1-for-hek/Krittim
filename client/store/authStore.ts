import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/lib/types';

export const getApiBaseUrl = (): string =>
  (process.env.NEXT_PUBLIC_API_URL ?? 'https://krittim-server.vercel.app').replace(/\/$/, '');

const ACCESS_KEY = 'krittim-access-token';
const REFRESH_KEY = 'krittim-refresh-token';

export const getAccessToken = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);

const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

/* ----------------------------- token refresh ----------------------------- */

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return null;
      const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;
      const data = await response.json() as { accessToken?: string; refreshToken?: string };
      if (!data.accessToken) return null;
      localStorage.setItem(ACCESS_KEY, data.accessToken);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Authenticated fetch that transparently refreshes an expired access token once. */
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const run = (token: string | null): Promise<Response> =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await run(getAccessToken());
  if (response.status === 401) {
    const token = await refreshAccessToken();
    if (token) response = await run(token);
  }
  return response;
}

/* ------------------------------- profile -------------------------------- */

type Plan = 'free' | 'pro' | 'enterprise';

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free · Krittim AI',
  pro: 'Pro · Krittim AI',
  enterprise: 'Enterprise · Krittim AI',
};

function toProfile(user: {
  name: string;
  email: string;
  plan?: Plan;
  avatarUrl?: string;
  provider?: UserProfile['provider'];
}): UserProfile {
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!)
      .join('')
      .toUpperCase() || user.email[0]!.toUpperCase();
  return {
    name: user.name,
    email: user.email,
    handle: `@${user.email.split('@')[0]}`,
    plan: PLAN_LABEL[user.plan ?? 'free'] ?? PLAN_LABEL.free,
    initials,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
  };
}

export function expireSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  useAuthStore.setState({ user: null, isAuthenticated: false });
}

/* -------------------------------- store --------------------------------- */

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** True until the stored session has been validated on mount. */
  checking: boolean;
  authModalOpen: boolean;
  authMode: 'login' | 'signup';
  isLoading: boolean;

  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;

  /** Redirect the whole browser to the server's OAuth entrypoint. */
  loginWithProvider: (provider: 'google' | 'github' | 'discord') => void;
  /** Email + password against our own API. */
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, password: string) => Promise<void>;

  /** Called by /auth/callback once tokens are parsed from the URL fragment. */
  completeOAuthFromCallback: (accessToken: string, refreshToken: string) => Promise<void>;
  failOAuth: (message: string) => void;

  /** Validate any stored token and hydrate the user on app start. */
  hydrateSession: () => Promise<void>;

  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      checking: true,
      authModalOpen: false,
      authMode: 'login',
      isLoading: false,

      openAuthModal: (mode = 'login') => set({ authModalOpen: true, authMode: mode }),
      closeAuthModal: () => set({ authModalOpen: false }),

      loginWithProvider: (provider) => {
        // Full-page redirect — the server drives the provider dance and bounces
        // the user back to /auth/callback with a fresh JWT pair.
        window.location.assign(`${getApiBaseUrl()}/api/auth/oauth/${provider}`);
      },

      loginWithEmail: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json() as { user?: Parameters<typeof toProfile>[0]; accessToken?: string; refreshToken?: string; error?: unknown };
          if (!response.ok || !data.accessToken) {
            throw new Error(typeof data.error === 'string' ? data.error : 'Invalid email or password');
          }
          setTokens(data.accessToken, data.refreshToken!);
          set({ user: toProfile(data.user!), isAuthenticated: true, authModalOpen: false, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signupWithEmail: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          });
          const data = await response.json() as { user?: Parameters<typeof toProfile>[0]; accessToken?: string; refreshToken?: string; error?: unknown };
          if (!response.ok || !data.accessToken) {
            throw new Error(typeof data.error === 'string' ? data.error : 'Could not create account');
          }
          setTokens(data.accessToken, data.refreshToken!);
          set({ user: toProfile(data.user!), isAuthenticated: true, authModalOpen: false, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      completeOAuthFromCallback: async (accessToken, refreshToken) => {
        setTokens(accessToken, refreshToken);
        const response = await apiFetch('/api/auth/me');
        if (!response.ok) {
          expireSession();
          set({ checking: false });
          throw new Error('Session could not be verified');
        }
        const data = await response.json() as { user: Parameters<typeof toProfile>[0] };
        set({ user: toProfile(data.user), isAuthenticated: true, checking: false, authModalOpen: false });
      },

      failOAuth: (message) => {
        expireSession();
        set({ checking: false, authModalOpen: true, authMode: 'login' });
        if (message) {
          // Surface a readable reason without leaking internals.
          // eslint-disable-next-line no-console
          console.warn('[auth] oauth error:', message);
        }
      },

      hydrateSession: async () => {
        if (typeof window === 'undefined') { set({ checking: false }); return; }
        if (!getAccessToken()) { set({ checking: false }); return; }
        try {
          const response = await apiFetch('/api/auth/me');
          if (!response.ok) { expireSession(); return; }
          const data = await response.json() as { user: Parameters<typeof toProfile>[0] };
          set({ user: toProfile(data.user), isAuthenticated: true });
        } catch {
          expireSession();
        } finally {
          set({ checking: false });
        }
      },

      logout: async () => {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
        } catch {
          /* network down — clear locally regardless */
        }
        expireSession();
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'krittim-auth-store',
      version: 2,
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
