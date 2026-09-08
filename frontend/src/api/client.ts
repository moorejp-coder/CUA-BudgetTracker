import axios from "axios";

// Auth lives entirely in httpOnly cookies set by the backend — this file never sees,
// stores, or reads an access/refresh token; page JavaScript simply can't. The only cookie
// JS ever touches is csrf_token, which is deliberately non-httpOnly (see backend
// core/cookies.py) so it can be echoed back as a header on mutating requests.
const CSRF_COOKIE = "csrf_token";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const api = axios.create({ baseURL: "/api/v1", withCredentials: true });

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (method !== "get" && method !== "head" && method !== "options") {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

let refreshing: Promise<unknown> | null = null;
// /auth/me is the deliberate "is there a session at all" probe (see useAuth) — a 401
// there just means "not logged in," not "session expired mid-use," so it must NOT trigger
// an auto-refresh attempt (which would itself 401/403 with no session cookie yet and
// force a redirect while merely checking auth status on app load).
const NO_REFRESH_RETRY = new Set(["/auth/refresh", "/auth/me"]);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !NO_REFRESH_RETRY.has(original.url)) {
      original._retry = true;
      try {
        refreshing = refreshing ?? api.post("/auth/refresh");
        await refreshing;
        refreshing = null;
        return api(original);
      } catch {
        refreshing = null;
        if (window.location.pathname !== "/login") window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
