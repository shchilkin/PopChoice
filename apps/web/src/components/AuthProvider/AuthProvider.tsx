'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { getCsrfToken } from '@/lib/csrfClient';

type AuthState = {
  status: 'unknown' | 'authenticated' | 'anonymous';
  userId: string | null;
};

type SessionResponse = {
  authenticated?: boolean;
  userId?: string;
};

interface AuthContextValue {
  auth: AuthState;
  isAuthenticated: boolean;
  refreshSession: () => Promise<AuthState>;
  logout: () => Promise<void>;
}

let authStore: AuthState = { status: 'unknown', userId: null };
const authListeners = new Set<() => void>();

function subscribeAuth(callback: () => void): () => void {
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
}

function getAuthSnapshot(): AuthState {
  return authStore;
}

function setAuthStore(nextAuth: AuthState): void {
  authStore = nextAuth;
  authListeners.forEach((listener) => listener());
}

async function fetchSession(): Promise<AuthState> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return { status: 'anonymous', userId: null };
    }

    return toAuthState((await response.json()) as SessionResponse);
  } catch {
    return { status: 'anonymous', userId: null };
  }
}

function toAuthState(data: SessionResponse): AuthState {
  return data.authenticated && data.userId
    ? { status: 'authenticated', userId: data.userId }
    : { status: 'anonymous', userId: null };
}

const AuthContext = createContext<AuthContextValue>({
  auth: { status: 'unknown', userId: null },
  isAuthenticated: false,
  refreshSession: async () => ({ status: 'unknown', userId: null }),
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

  const refreshSession = useCallback(async () => {
    const nextAuth = await fetchSession();
    setAuthStore(nextAuth);
    return nextAuth;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });
    } finally {
      setAuthStore({ status: 'anonymous', userId: null });
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        auth,
        isAuthenticated: auth.status === 'authenticated',
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
