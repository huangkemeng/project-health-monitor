import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({
            username,
            password,
            remember_me: rememberMe,
          });

          // Store token in localStorage before updating state
          localStorage.setItem('token', response.token);

          // Update state synchronously
          set({
            user: {
              ...response.user,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Wait a tick to ensure localStorage is written
          await new Promise(resolve => setTimeout(resolve, 0));
        } catch (error) {
          const message = error instanceof Error ? error.message : '登录失败';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string, confirmPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register({
            username,
            email,
            password,
            confirm_password: confirmPassword,
          });
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : '注册失败';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      fetchUser: async () => {
        try {
          const response = await authApi.me();
          set({
            user: {
              ...response,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Fetch user error:', error);
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
