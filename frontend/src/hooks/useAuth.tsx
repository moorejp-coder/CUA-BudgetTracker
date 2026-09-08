import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, website?: string) => Promise<void>;
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

  async function login(email: string, password: string) {
    await api.post("/auth/login", { email, password });
    setIsAuthenticated(true);
    navigate("/");
  }

  async function register(email: string, password: string, display_name: string, website = "") {
    await api.post("/auth/register", { email, password, display_name, website });
    setIsAuthenticated(true);
    navigate("/");
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
