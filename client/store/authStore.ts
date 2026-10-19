import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/lib/types';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  login: (provider: 'google' | 'github' | 'discord' | 'email', email?: string, password?: string, signup?: boolean) => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
}

const MOCK_USERS: Record<'google' | 'github' | 'discord' | 'email', UserProfile> = {
  google: {
    name: 'Alex Chen',
    email: 'alex.chen@gmail.com',
    handle: '@alexchen',
    plan: 'Pro · Krittim AI',
    initials: 'AC',
  },
  github: {
    name: 'Jordan Smith',
    email: 'jordan.smith@github.com',
    handle: '@jordansmith',
    plan: 'Enterprise · Krittim AI',
    initials: 'JS',
  },
  discord: {
    name: 'Discord User',
    email: 'user@discord.com',
    handle: '@discorduser',
    plan: 'Free · Krittim AI',
    initials: 'DU',
  },
  email: {
    name: 'Email User',
    email: 'user@example.com',
    handle: '@emailuser',
    plan: 'Free · Krittim AI',
    initials: 'EU',
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authModalOpen: false,
      authMode: 'login',

      openAuthModal: (mode = 'login') => set({ authModalOpen: true, authMode: mode }),
      closeAuthModal: () => set({ authModalOpen: false }),

      login: async (provider, email, password, signup = false) => {
        set({ isLoading: true });
        if (provider !== 'email') {
          await new Promise((resolve) => setTimeout(resolve, 900));
          set({ user: { ...MOCK_USERS[provider] }, isAuthenticated: true, isLoading: false, authModalOpen: false });
          return;
        }
        try {
          const apiBaseUrl = (
            process.env.NEXT_PUBLIC_API_URL ?? 'https://krittim-server.vercel.app'
          ).replace(/\/$/, '');
          const response = await fetch(`${apiBaseUrl}/api/auth/${signup ? 'signup' : 'login'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signup
              ? { name: email?.split('@')[0] ?? 'Krittim User', email, password }
              : { email, password }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? 'Authentication failed');
          localStorage.setItem('krittim-access-token', data.accessToken);
          localStorage.setItem('krittim-refresh-token', data.refreshToken);
          set({ user: { ...MOCK_USERS.email, name: data.user.name, email: data.user.email }, isAuthenticated: true, isLoading: false, authModalOpen: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('krittim-access-token');
        localStorage.removeItem('krittim-refresh-token');
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user: UserProfile | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'krittim-auth-store',
      version: 1,
    },
  ),
);