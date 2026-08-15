import axios from "axios";

const TOKEN_KEY = "bt.tokens";

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export function getTokens(): Tokens | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setTokens(tokens: Tokens | null) {
  if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  else localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const tokens = getTokens();
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

let refreshing: Promise<Tokens> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const tokens = getTokens();
      if (!tokens?.refresh_token) {
        setTokens(null);
        window.location.href = "/login";
        return Promise.reject(error);
      }
      try {
        refreshing =
          refreshing ??
          axios
            .post("/api/v1/auth/refresh", { refresh_token: tokens.refresh_token })
            .then((r) => r.data);
        const newTokens = await refreshing;
        refreshing = null;
        setTokens(newTokens);
        original.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return api(original);
      } catch {
        refreshing = null;
        setTokens(null);
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
