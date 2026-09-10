import { useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/api/client";

type Mode = "login" | "register" | "forgot" | "reset";

function extractErrorMessage(e: any): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg ?? JSON.stringify(d)).join(" ");
  }
  return "Something went wrong";
}

const TITLES: Record<Mode, string> = {
  login: "Welcome back",
  register: "Create your account",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

export default function Login() {
  const { login, register } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Two possible sources for "where to go back to": ?redirect= on the URL (could come from
  // an external/emailed link — untrusted) and location.state.from (set only by this app's
  // own RequireAuth redirect when a session expires mid-visit — trusted, but validated the
  // same way regardless since it costs nothing and keeps this one code path uniform).
  const redirectTo = searchParams.get("redirect") ?? (location.state as { from?: string } | null)?.from;
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — see the hidden input below
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  // null = not checked yet, true = confirmed valid, false = confirmed invalid/expired.
  // The new-password field only appears once this is true — no point letting someone
  // fill out a password for a token that's already dead.
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setTokenValid(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password, redirectTo);
      } else if (mode === "register") {
        await register(email, password, displayName, website, redirectTo);
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email });
        // This app has no email sending set up — it's self-hosted, so the reset link is
        // written to the server's own logs instead. Not a real product flow for a
        // multi-user deployment; wire up actual email delivery before using this there.
        setNotice(
          "If that email has an account, a reset token was generated — the server operator " +
            "can find it in the backend logs. Enter it below once you have it."
        );
        setMode("reset");
      } else if (mode === "reset" && tokenValid !== true) {
        // Step 1: validate the token before ever showing a password field for it.
        const { data } = await api.post("/auth/validate-reset-token", { token: resetToken });
        if (!data.valid) {
          setError("This reset token is invalid or has expired. Request a new one.");
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      } else if (mode === "reset" && tokenValid === true) {
        // Step 2: token already confirmed valid — now actually set the new password.
        await api.post("/auth/reset-password", { token: resetToken, new_password: newPassword });
        setNotice("Password updated. You can log in with your new password now.");
        setMode("login");
        setPassword("");
      }
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink/90 flex items-center justify-center">
      <div className="card w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="brand-mark w-8 h-8 font-display italic font-semibold text-lg">b</div>
          <span className="font-display italic text-lg text-ink">Budget Tracker</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight mb-1">{TITLES[mode]}</h1>
        <p className="text-sm text-ink/50 mb-6">Your data stays on this server. No banks, no third parties.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot: real users never see this (off-screen, unfocusable, no label) —
              a bot that blindly fills every input on the page will populate it, and the
              backend rejects any registration where it's non-empty. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />
          {mode === "register" && (
            <div>
              <label className="label">Name</label>
              <input className="input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          )}

          {mode !== "reset" && (
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {mode === "reset" && (
            <>
              <div>
                <label className="label">Reset token</label>
                <input
                  required
                  disabled={tokenValid === true}
                  className="input w-full"
                  value={resetToken}
                  onChange={(e) => {
                    setResetToken(e.target.value);
                    setTokenValid(null); // editing the token invalidates any prior check
                  }}
                />
              </div>
              {tokenValid === true && (
                <div>
                  <label className="label">New password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoFocus
                    className="input w-full"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {notice && <div className="text-sm text-ink/70">{notice}</div>}
          {error && <div className="text-sm text-expense">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {mode === "login" && "Log in"}
            {mode === "register" && "Create account"}
            {mode === "forgot" && "Send reset link"}
            {mode === "reset" && (tokenValid === true ? "Set new password" : "Verify token")}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {mode === "login" && (
            <>
              <button className="text-sm text-ink/50 hover:text-ink block" onClick={() => switchMode("register")}>
                Need an account? Register
              </button>
              <button className="text-sm text-ink/50 hover:text-ink block" onClick={() => switchMode("forgot")}>
                Forgot your password?
              </button>
            </>
          )}
          {mode !== "login" && (
            <button className="text-sm text-ink/50 hover:text-ink block" onClick={() => switchMode("login")}>
              Back to log in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
