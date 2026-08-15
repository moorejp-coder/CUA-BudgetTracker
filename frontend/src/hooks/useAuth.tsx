import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, getTokens, setTokens } from "@/api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getTokens());
  const navigate = useNavigate();

  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    setTokens(data);
    setIsAuthenticated(true);
    navigate("/");
  }

  async function register(email: string, password: string, display_name: string) {
    const { data } = await api.post("/auth/register", { email, password, display_name });
    setTokens(data);
    setIsAuthenticated(true);
    navigate("/");
  }

  function logout() {
    setTokens(null);
    setIsAuthenticated(false);
    navigate("/login");
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
