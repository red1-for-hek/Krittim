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
  login: (provider: 'google' | 'github') => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile | null) => void;
}

const MOCK_USERS: Record<'google' | 'github', UserProfile> = {
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

      login: async (provider: 'google' | 'github') => {
        set({ isLoading: true });
        // Simulate OAuth flow delay
        await new Promise((resolve) => setTimeout(resolve, 900));
        const user = MOCK_USERS[provider];
        set({ user, isAuthenticated: true, isLoading: false, authModalOpen: false });
      },

      logout: () => {
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