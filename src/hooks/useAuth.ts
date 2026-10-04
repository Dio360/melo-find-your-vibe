'use client';

import { create } from 'zustand';
import { api, getToken, setToken, type ApiUser } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: ApiUser | null;
  ready: boolean;
  init: () => Promise<void>;
  login: (token: string, user: ApiUser) => void;
  logout: () => void;
  setName: (name: string) => void;
}

export const useAuth = create<AuthState>()((set) => ({
  token: null,
  user: null,
  ready: false,
  init: async () => {
    const token = getToken();
    if (!token) {
      set({ ready: true });
      return;
    }
    try {
      const me = await api.me();
      set({ token, user: me, ready: true });
    } catch {
      setToken(null);
      set({ token: null, user: null, ready: true });
    }
  },
  login: (token, user) => {
    setToken(token);
    set({ token, user });
  },
  logout: () => {
    setToken(null);
    set({ token: null, user: null });
  },
  setName: (name) =>
    set((s) => (s.user ? { user: { ...s.user, name } } : s)),
}));
