import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthResponse } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  rememberMe: boolean;

  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

// Base store configuration without persist
const createBaseStore = (set: any, get: any) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  rememberMe: false,

  login: async (username: string, password: string, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({
        username,
        password,
        remember_me: rememberMe,
      });

      // Store token in localStorage for API calls
      localStorage.setItem('token', response.token);
      
      // Store remember me preference
      localStorage.setItem('rememberMe', String(rememberMe));

      // Update state
      set({
        user: {
          ...response.user,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        rememberMe,
      });

      // If not remember me, set up session storage only
      if (!rememberMe) {
        // Store in sessionStorage instead of localStorage for non-remember me
        sessionStorage.setItem('token', response.token);
        // We'll clear localStorage token on page unload
        const handleBeforeUnload = () => {
          localStorage.removeItem('token');
          localStorage.removeItem('rememberMe');
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
      }
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
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
        rememberMe: false,
      });
      // Redirect to login page immediately
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
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
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    }
  },

  clearError: () => set({ error: null }),
});

// Create store with persist for remember me functionality
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => createBaseStore(set, get),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Only persist if remember me was checked
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        if (!rememberMe) {
          return {}; // Don't persist anything
        }
        return {
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
          rememberMe: state.rememberMe,
        };
      },
    }
  )
);

// Initialize auth state from storage on app load
export function initAuth() {
  if (typeof window === 'undefined') return;
  
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  const token = rememberMe 
    ? localStorage.getItem('token') 
    : sessionStorage.getItem('token');
  
  if (token) {
    // Set token in localStorage for API calls
    localStorage.setItem('token', token);
  }
}
