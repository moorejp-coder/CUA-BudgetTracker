import { useState } from "react";
import { api } from "@/api/client";

function extractErrorMessage(e: any): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg ?? JSON.stringify(d)).join(" ");
  }
  return "Something went wrong";
}

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      setNotice("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoutEverywhere() {
    setSigningOutAll(true);
    try {
      await api.post("/auth/logout-all");
    } catch {
      // Fall through regardless — the point is ending up logged out either way.
    } finally {
      // Full reload rather than client-side navigation: this device's own session just
      // died too (that's the point of "everywhere"), so re-check auth state from scratch
      // instead of trusting anything already in memory.
      window.location.href = "/login";
    }
  }

  return (
    <div className="max-w-sm">
      <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-ink/50 mb-6">Manage your account.</p>

      <div className="card">
        <h2 className="panel-title">Change password</h2>
        <p className="panel-subtitle mb-4">Update the password you use to sign in.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              required
              className="input w-full"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-ink/40 mt-1">At least 8 characters. Avoid common/breached passwords.</p>
          </div>
          {notice && <div className="text-sm text-income">{notice}</div>}
          {error && <div className="text-sm text-expense">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            Update password
          </button>
        </form>
      </div>

      <div className="card mt-4">
        <h2 className="panel-title">Log out everywhere</h2>
        <p className="panel-subtitle mb-4">
          Ends every active session for your account, including this one — on any other device or
          browser you're signed into. Use this if you think your account may be compromised.
        </p>
        <button
          type="button"
          disabled={signingOutAll}
          onClick={handleLogoutEverywhere}
          className="btn-secondary w-full text-expense"
        >
          {signingOutAll ? "Signing out everywhere…" : "Log out everywhere"}
        </button>
      </div>
    </div>
  );
}
