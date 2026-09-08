// Post-login "return to where you were" support. The candidate path can come from a URL
// query param (?redirect=...) that a shared/emailed login link controls, so it must never
// be trusted as-is — a phishing link like /login?redirect=https://evil.example.com relies
// on exactly this being trusted blindly. Only a path that exactly matches one of this
// app's own routes is allowed through; anything else (a full URL, a protocol-relative
// "//evil.com", a scheme-smuggling "/\evil.com", or just an unrecognized path) falls back
// to the default destination instead.
const ALLOWED_REDIRECT_PATHS = new Set([
  "/",
  "/transactions",
  "/categories",
  "/accounts",
  "/recurring",
  "/cashflow",
  "/assistant",
  "/forecasts",
  "/subscriptions",
  "/anomalies",
  "/coach",
  "/recaps",
  "/settings",
]);

export function getSafeRedirect(target: unknown, fallback = "/"): string {
  if (typeof target !== "string") return fallback;
  return ALLOWED_REDIRECT_PATHS.has(target) ? target : fallback;
}
