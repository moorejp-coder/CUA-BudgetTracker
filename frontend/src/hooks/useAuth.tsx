import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { getSafeRedirect } from "@/lib/safeRedirect";

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    website?: string,
    redirectTo?: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth now lives in an httpOnly cookie the frontend can't read directly, so unlike the
  // old localStorage-token check this can't be known synchronously on first render — ask
  // the backend whether the browser's cookie jar holds a valid session.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/auth/me")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string, redirectTo?: string) {
    await api.post("/auth/login", { email, password });
    setIsAuthenticated(true);
    // redirectTo may originate from a ?redirect= query param on the login URL, which an
    // external link controls — getSafeRedirect only lets through a path matching one of
    // this app's own routes, so a crafted link can't send the user on to another site
    // right after they've just authenticated.
    navigate(getSafeRedirect(redirectTo));
  }

  async function register(
    email: string,
    password: string,
    display_name: string,
    website = "",
    redirectTo?: string
  ) {
    await api.post("/auth/register", { email, password, display_name, website });
    setIsAuthenticated(true);
    navigate(getSafeRedirect(redirectTo));
  }

  function logout() {
    // Best-effort — revoke the session server-side so the cookies can't be replayed if
    // they leaked. Don't block navigation on it either way.
    api.post("/auth/logout").catch(() => {});
    setIsAuthenticated(false);
    navigate("/login");
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
