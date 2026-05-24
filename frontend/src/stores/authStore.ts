import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  divisi: string;
  role: 'admin' | 'anggota';
}

interface AuthState {
  user: User | null;
  isHydrated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: 'auth-storage', // name of item in local storage
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated(true);
      },
    }
  )
);
