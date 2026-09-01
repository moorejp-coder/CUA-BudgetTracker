import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function extractErrorMessage(e: any): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg ?? JSON.stringify(d)).join(" ");
  }
  return "Something went wrong";
}

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, displayName);
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
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-display italic font-semibold text-canvas text-lg">b</div>
          <span className="font-display italic text-lg text-ink">Budget Tracker</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink tracking-tight mb-1">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-ink/50 mb-6">Your data stays on this server. No banks, no third parties.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="label">Name</label>
              <input className="input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
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
          {error && <div className="text-sm text-expense">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          className="text-sm text-ink/50 hover:text-ink mt-4"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
