import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountsApi } from "@/api/resources";

const TYPES = ["checking", "savings", "credit_card", "loan", "investment", "cash", "other"];

export default function Accounts() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });
  const [form, setForm] = useState({ name: "", type: "checking", institution: "", current_balance: "", is_liability: false });
  const [snapshotFor, setSnapshotFor] = useState<string | null>(null);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await AccountsApi.create({ ...form, current_balance: parseFloat(form.current_balance || "0") });
    setForm({ name: "", type: "checking", institution: "", current_balance: "", is_liability: false });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  }

  async function removeAccount(id: string) {
    if (!confirm("Delete this account and all its transactions?")) return;
    await AccountsApi.remove(id);
    qc.invalidateQueries({ queryKey: ["accounts"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Accounts</h1>

      <div className="card">
        <h2 className="text-sm font-semibold mb-3">Add account</h2>
        <form onSubmit={addAccount} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Institution</label>
            <input className="input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          </div>
          <div>
            <label className="label">Starting balance</label>
            <input
              type="number"
              step="0.01"
              className="input w-32"
              value={form.current_balance}
              onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
            />
          </div>
          <label className="text-xs text-ink/60 flex items-center gap-1.5 pb-2">
            <input type="checkbox" checked={form.is_liability} onChange={(e) => setForm({ ...form, is_liability: e.target.checked })} />
            Liability (credit card / loan)
          </label>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((a) => (
          <div key={a.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-ink/40 capitalize">
                  {a.type.replace("_", " ")} {a.institution && `· ${a.institution}`}
                </div>
              </div>
              <button onClick={() => removeAccount(a.id)} className="text-ink/30 hover:text-expense text-xs">
                Delete
              </button>
            </div>
            <div className={`text-2xl numeral mt-3 ${a.is_liability ? "text-expense" : "text-ink"}`}>
              ${a.current_balance.toFixed(2)}
            </div>
            <button className="text-accent text-xs mt-3" onClick={() => setSnapshotFor(snapshotFor === a.id ? null : a.id)}>
              {snapshotFor === a.id ? "Cancel" : "Update balance"}
            </button>
            {snapshotFor === a.id && <BalanceSnapshotForm accountId={a.id} onDone={() => setSnapshotFor(null)} />}
          </div>
        ))}
        {accounts.length === 0 && <p className="text-ink/40 text-sm">No accounts yet — add one above.</p>}
      </div>
    </div>
  );
}

function BalanceSnapshotForm({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [balance, setBalance] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await AccountsApi.addSnapshot(accountId, date, parseFloat(balance));
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["net-worth"] });
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mt-2">
      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="number" step="0.01" placeholder="Balance" className="input w-28" value={balance} onChange={(e) => setBalance(e.target.value)} />
      <button className="btn-primary text-xs px-2">Save</button>
    </form>
  );
}
