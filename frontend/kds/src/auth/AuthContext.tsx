import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { login } from '../api/authApi';
import { setUnauthorizedHandler } from '../api/httpClient';
import type { Session } from '../types';
import { clearSession, loadSession, saveSession } from './tokenStorage';

interface AuthValue {
  session: Session | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const s = await login(username, password);
    saveSession(s);
    setSession(s);
  }, []);

  // Token hết hạn ở bất kỳ request nào -> tự quay về trang đăng nhập
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
