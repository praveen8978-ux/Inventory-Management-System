import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";

export type Organization = { id: string; name: string; defaultLowStockThreshold: number };
export type AuthUser = { id: string; email: string; organization: Organization };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean; // true until the first /auth/me check finishes
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, organizationName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on page load (the httpOnly cookie is sent automatically)
  useEffect(() => {
    api
      .get<AuthUser>("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<AuthUser>("/auth/login", { email, password });
    setUser(r.data);
  }, []);

  const signup = useCallback(async (email: string, password: string, organizationName: string) => {
    const r = await api.post<AuthUser>("/auth/signup", { email, password, organizationName });
    setUser(r.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}