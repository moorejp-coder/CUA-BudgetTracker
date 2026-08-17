import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountsApi, CsvImportApi } from "@/api/resources";

const INTERNAL_FIELDS = ["date", "amount", "description", "balance"];

interface PreviewData {
  columns: string[];
  sample_rows: Record<string, string>[];
  guessed_mapping: Record<string, string | null>;
  upload_token: string;
}

export default function CsvImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [signConvention, setSignConvention] = useState("negative_is_expense");
  const [templateName, setTemplateName] = useState("");
  const [result, setResult] = useState<{ imported: number; duplicates_skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });

  async function handleUpload() {
    if (!file) return;
    setError("");
    try {
      const data = await CsvImportApi.preview(file);
      setPreview(data);
      const guessed: Record<string, string> = {};
      Object.entries(data.guessed_mapping).forEach(([field, col]) => {
        if (col) guessed[field] = col as string;
      });
      setMapping(guessed);
      setStep(2);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not read this file");
    }
  }

  async function handleCommit() {
    if (!preview || !accountId) return;
    setError("");
    try {
      const data = await CsvImportApi.commit({
        upload_token: preview.upload_token,
        account_id: accountId,
        column_mapping: mapping,
        date_format: "%Y-%m-%d",
        amount_sign_convention: signConvention,
        save_as_template: templateName || undefined,
      });
      setResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Import failed");
    }
  }

  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-2 mb-6 text-xs font-medium text-ink/50">
        {["Upload", "Map Columns", "Review & Confirm"].map((label, i) => (
          <div key={label} className={`flex items-center gap-2 ${step === i + 1 ? "text-accent" : ""}`}>
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center numeral text-[11px] ${
                step === i + 1 ? "bg-accent text-canvas" : "bg-surface-sunken"
              }`}
            >
              {i + 1}
            </span>
            {label}
            {i < 2 && <span className="text-ink/20">—</span>}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 text-sm text-expense bg-expense-bg rounded-lg px-3 py-2">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-ink/60">
            Export a transaction CSV from your bank's website, then upload it here. Nothing is sent anywhere
            except this server.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input w-full"
          />
          <button className="btn-primary" disabled={!file} onClick={handleUpload}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <div>
            <label className="label">Account</label>
            <select className="input w-full" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTERNAL_FIELDS.map((field) => (
              <div key={field}>
                <label className="label capitalize">{field}</label>
                <select
                  className="input w-full"
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                >
                  <option value="">(none)</option>
                  {preview.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="label">Amount sign convention</label>
            <select className="input w-full" value={signConvention} onChange={(e) => setSignConvention(e.target.value)}>
              <option value="negative_is_expense">Negative = expense, positive = income</option>
              <option value="always_positive_expense">All amounts are positive expenses</option>
              <option value="separate_debit_credit">Separate debit/credit columns</option>
            </select>
          </div>
          <div>
            <label className="label">Save mapping as a template (optional)</label>
            <input
              className="input w-full"
              placeholder="e.g. Chase Checking"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto border border-border-subtle rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-surface-sunken text-ink/50">
                <tr>
                  {INTERNAL_FIELDS.map((f) => (
                    <th key={f} className="text-left px-3 py-2 capitalize">
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample_rows.map((row, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    {INTERNAL_FIELDS.map((f) => (
                      <td key={f} className="px-3 py-2 text-ink/70">
                        {mapping[f] ? row[mapping[f]] : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary" disabled={!accountId || !mapping.date || !mapping.amount} onClick={handleCommit}>
              Import
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-3">
          <div className="text-income">
            Imported <span className="numeral">{result.imported}</span> transactions.
          </div>
          {result.duplicates_skipped > 0 && (
            <div className="text-ink/60 text-sm">{result.duplicates_skipped} duplicates skipped.</div>
          )}
          {result.errors.length > 0 && (
            <div className="text-warning text-sm">
              {result.errors.length} rows had errors:
              <ul className="list-disc list-inside mt-1 text-ink/50">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="btn-primary"
            onClick={() => {
              setStep(1);
              setFile(null);
              setPreview(null);
              setResult(null);
            }}
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
