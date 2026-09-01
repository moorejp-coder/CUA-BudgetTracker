import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BucketsApi } from "@/api/resources";
import type { Bucket, SummaryBucket } from "@/types";

function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `key_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function extractErrorMessage(e: any): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? JSON.stringify(d)).join(" ");
  return "Something went wrong. Please try again.";
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function AccountBuckets({ accountId, currentBalance }: { accountId: string; currentBalance: number }) {
  const qc = useQueryClient();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["bucket-summary", accountId],
    queryFn: () => BucketsApi.summary(accountId),
  });
  const { data: allBuckets = [] } = useQuery({
    queryKey: ["buckets", accountId],
    queryFn: () => BucketsApi.list(accountId),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [allocateBucket, setAllocateBucket] = useState<SummaryBucket | null>(null);
  const [moveBucket, setMoveBucket] = useState<SummaryBucket | null>(null);
  const [editBucketId, setEditBucketId] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["bucket-summary", accountId] });
    qc.invalidateQueries({ queryKey: ["buckets", accountId] });
    qc.invalidateQueries({ queryKey: ["bucket-ledger", accountId] });
  }

  const buckets = summary?.buckets ?? [];
  const archivedCount = allBuckets.filter((b) => b.status === "archived").length;

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Savings Goals</h3>
        <div className="flex items-center gap-3">
          <button className="text-ink/40 hover:text-ink text-xs" onClick={() => setShowActivity((v) => !v)}>
            {showActivity ? "Hide activity" : "Activity"}
          </button>
          <button className="text-accent text-xs" onClick={() => setShowCreate(true)}>
            + Create goal
          </button>
        </div>
      </div>

      {isLoading && <p className="text-ink/40 text-xs">Loading goals…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <Stat label="Total Savings" value={summary.account_balance} tone="text-ink" />
            <Stat label="Assigned to Goals" value={summary.assigned_balance} tone="text-ink/70" />
            <Stat
              label="Available to Allocate"
              value={summary.unassigned_balance}
              tone={summary.unassigned_balance > 0 ? "text-income" : "text-ink/50"}
            />
          </div>

          {buckets.length === 0 ? (
            <p className="text-ink/40 text-xs mb-3">
              No goals yet — all ${currentBalance.toFixed(2)} is available to allocate. Create a goal to start
              setting money aside.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              {buckets.map((b) => (
                <BucketCard
                  key={b.id}
                  bucket={b}
                  onAllocate={() => setAllocateBucket(b)}
                  onMove={() => setMoveBucket(b)}
                  onEdit={() => setEditBucketId(b.id)}
                />
              ))}
            </div>
          )}

          {summary.unassigned_balance <= 0 && buckets.length > 0 && (
            <p className="text-ink/40 text-xs mb-2">
              Every dollar is assigned to a goal right now — nothing available to allocate.
            </p>
          )}
          {archivedCount > 0 && <p className="text-ink/30 text-xs mb-2">{archivedCount} archived goal(s) — see activity for history.</p>}
        </>
      )}

      {showActivity && <ActivityHistory accountId={accountId} />}

      {showCreate && <CreateBucketModal accountId={accountId} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); invalidate(); }} />}
      {allocateBucket && (
        <AllocateModal
          bucket={allocateBucket}
          available={summary?.unassigned_balance ?? 0}
          onClose={() => setAllocateBucket(null)}
          onDone={() => { setAllocateBucket(null); invalidate(); }}
        />
      )}
      {moveBucket && (
        <MoveMoneyModal
          bucket={moveBucket}
          otherBuckets={buckets.filter((b) => b.id !== moveBucket.id)}
          onClose={() => setMoveBucket(null)}
          onDone={() => { setMoveBucket(null); invalidate(); }}
        />
      )}
      {editBucketId && (
        <EditBucketModal
          bucket={allBuckets.find((b) => b.id === editBucketId) ?? null}
          onClose={() => setEditBucketId(null)}
          onDone={() => { setEditBucketId(null); invalidate(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="text-ink/40">{label}</div>
      <div className={`numeral text-base font-semibold ${tone}`}>{money(value)}</div>
    </div>
  );
}

function BucketCard({
  bucket,
  onAllocate,
  onMove,
  onEdit,
}: {
  bucket: SummaryBucket;
  onAllocate: () => void;
  onMove: () => void;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const hasTarget = bucket.target_amount !== null && bucket.target_amount !== undefined;
  const pct = bucket.progress_percentage;
  const overfunded = hasTarget && pct !== null && pct > 100;
  const fullyFunded = hasTarget && pct !== null && pct >= 100;

  async function archive() {
    setError("");
    try {
      await BucketsApi.archive(bucket.id);
      qc.invalidateQueries({ queryKey: ["bucket-summary"] });
      qc.invalidateQueries({ queryKey: ["buckets"] });
    } catch (e: any) {
      setError(extractErrorMessage(e));
    }
    setMenuOpen(false);
  }

  return (
    <div className="rounded-lg border border-border-subtle p-3 relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: bucket.color }} />
          <span className="font-medium text-sm">{bucket.name}</span>
        </div>
        <div className="relative">
          <button className="text-ink/30 hover:text-ink px-1" onClick={() => setMenuOpen((v) => !v)}>
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-10 bg-surface-raised border border-border rounded-lg shadow-lg text-xs w-40 overflow-hidden">
              <button className="block w-full text-left px-3 py-2 hover:bg-surface-sunken" onClick={() => { setMenuOpen(false); onAllocate(); }}>
                Allocate money
              </button>
              <button className="block w-full text-left px-3 py-2 hover:bg-surface-sunken" onClick={() => { setMenuOpen(false); onMove(); }}>
                Move money
              </button>
              <button className="block w-full text-left px-3 py-2 hover:bg-surface-sunken" onClick={() => { setMenuOpen(false); onEdit(); }}>
                Edit goal
              </button>
              <button className="block w-full text-left px-3 py-2 hover:bg-surface-sunken text-expense" onClick={archive}>
                Archive goal
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="numeral text-lg font-semibold mt-1.5">{money(bucket.balance)}</div>

      {hasTarget ? (
        <>
          <div className="flex items-center justify-between text-xs text-ink/50 mt-0.5">
            <span>of {money(bucket.target_amount as number)} goal</span>
            <span className={overfunded ? "text-income" : fullyFunded ? "text-income" : ""}>
              {pct !== null ? `${pct.toFixed(0)}%` : ""}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, pct ?? 0)}%`, background: overfunded ? "#4fae7b" : bucket.color }}
            />
          </div>
          {overfunded && <p className="text-income text-xs mt-1">Goal exceeded — consider raising the target or moving the extra out.</p>}
        </>
      ) : (
        <p className="text-ink/30 text-xs mt-1">No target set</p>
      )}

      {bucket.target_date && (
        <p className="text-ink/30 text-xs mt-1">Target date: {new Date(bucket.target_date).toLocaleDateString()}</p>
      )}
      {error && <p className="text-expense text-xs mt-2">{error}</p>}
    </div>
  );
}

function AllocateModal({
  bucket,
  available,
  onClose,
  onDone,
}: {
  bucket: SummaryBucket;
  available: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const amt = parseFloat(amount) || 0;
  const exceedsAvailable = amt > available;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amt || amt <= 0 || exceedsAvailable) return;
    setSubmitting(true);
    setError("");
    try {
      await BucketsApi.allocate(bucket.id, amt, newIdempotencyKey());
      onDone();
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title={`Allocate money — ${bucket.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-ink/50">
          Available to allocate: <span className="text-ink/80 numeral">{money(available)}</span>
        </p>
        <div>
          <label className="label">Amount</label>
          <input
            type="number"
            step="0.01"
            autoFocus
            className="input w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {amt > 0 && (
          <div className="text-xs text-ink/50 bg-surface-sunken/50 rounded-lg p-2 space-y-0.5">
            <div>
              {bucket.name} will become <span className="numeral text-ink">{money(bucket.balance + amt)}</span>
            </div>
            <div>
              Available to allocate will become{" "}
              <span className={`numeral ${exceedsAvailable ? "text-expense" : "text-ink"}`}>{money(available - amt)}</span>
            </div>
          </div>
        )}
        {exceedsAvailable && <p className="text-expense text-xs">You only have {money(available)} available to allocate.</p>}
        {error && <p className="text-expense text-xs">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="text-xs text-ink/50" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-xs px-3" disabled={submitting || !amt || exceedsAvailable}>
            Confirm
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function MoveMoneyModal({
  bucket,
  otherBuckets,
  onClose,
  onDone,
}: {
  bucket: SummaryBucket;
  otherBuckets: SummaryBucket[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [destination, setDestination] = useState<string>("unassigned");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const amt = parseFloat(amount) || 0;
  const exceeds = amt > bucket.balance;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amt || amt <= 0 || exceeds) return;
    setSubmitting(true);
    setError("");
    try {
      if (destination === "unassigned") {
        await BucketsApi.unassign(bucket.id, amt, newIdempotencyKey());
      } else {
        await BucketsApi.transfer(bucket.id, destination, amt, newIdempotencyKey());
      }
      onDone();
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const destName = destination === "unassigned" ? "Available to allocate" : otherBuckets.find((b) => b.id === destination)?.name;

  return (
    <ModalShell title={`Move money — ${bucket.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-ink/50">
          Currently in {bucket.name}: <span className="text-ink/80 numeral">{money(bucket.balance)}</span>
        </p>
        <div>
          <label className="label">Move to</label>
          <select className="input w-full" value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="unassigned">Available to allocate (Unassigned)</option>
            {otherBuckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input type="number" step="0.01" className="input w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {amt > 0 && (
          <div className="text-xs text-ink/50 bg-surface-sunken/50 rounded-lg p-2 space-y-0.5">
            <div>
              {bucket.name} will become <span className={`numeral ${exceeds ? "text-expense" : "text-ink"}`}>{money(bucket.balance - amt)}</span>
            </div>
            <div>
              {destName} will receive <span className="numeral text-ink">{money(amt)}</span>
            </div>
          </div>
        )}
        {exceeds && <p className="text-expense text-xs">This goal only has {money(bucket.balance)} available.</p>}
        {error && <p className="text-expense text-xs">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="text-xs text-ink/50" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-xs px-3" disabled={submitting || !amt || exceeds}>
            Confirm
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CreateBucketModal({ accountId, onClose, onDone }: { accountId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await BucketsApi.create(accountId, {
        name,
        description,
        target_amount: targetAmount ? parseFloat(targetAmount) : null,
        target_date: targetDate || null,
      });
      onDone();
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Create a savings goal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Goal name</label>
          <input className="input w-full" autoFocus placeholder="Emergency Fund" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Target amount (optional)</label>
            <input type="number" step="0.01" className="input w-full" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label">Target date (optional)</label>
            <input type="date" className="input w-full" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-expense text-xs">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="text-xs text-ink/50" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-xs px-3" disabled={submitting || !name.trim()}>
            Create goal
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditBucketModal({ bucket, onClose, onDone }: { bucket: Bucket | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(bucket?.name ?? "");
  const [description, setDescription] = useState(bucket?.description ?? "");
  const [targetAmount, setTargetAmount] = useState(bucket?.target_amount != null ? String(bucket.target_amount) : "");
  const [targetDate, setTargetDate] = useState(bucket?.target_date ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!bucket) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await BucketsApi.update(bucket!.id, {
        name,
        description,
        target_amount: targetAmount ? parseFloat(targetAmount) : null,
        target_date: targetDate || null,
      });
      onDone();
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Edit goal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Goal name</label>
          <input className="input w-full" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">Target amount</label>
            <input type="number" step="0.01" className="input w-full" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label">Target date</label>
            <input type="date" className="input w-full" value={targetDate ?? ""} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-expense text-xs">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" className="text-xs text-ink/50" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-xs px-3" disabled={submitting || !name.trim()}>
            Save
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ActivityHistory({ accountId }: { accountId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["bucket-ledger", accountId],
    queryFn: () => BucketsApi.ledger(accountId),
  });

  return (
    <div className="mb-3 rounded-lg border border-border-subtle p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-2">Activity</h4>
      {isLoading && <p className="text-ink/40 text-xs">Loading…</p>}
      {!isLoading && events.length === 0 && <p className="text-ink/40 text-xs">No allocation activity yet.</p>}
      <div className="space-y-1.5">
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between text-xs">
            <span className="text-ink/70">
              {e.label}
              {e.event_type !== "bucket_archived" && (
                <span className="text-ink/40">
                  {" "}
                  · {e.source_name} → {e.destination_name}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2 text-ink/40">
              {e.event_type !== "bucket_archived" && <span className="numeral">{money(e.amount)}</span>}
              <span>{new Date(e.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}
