"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Treatment = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  price: number;
  currency: string;
  durationMinutes?: number;
  type?: string;
  active: boolean;
};

type TreatmentsListProps = {
  onEdit?: (treatment: Treatment) => void;
};

export function TreatmentsList({ onEdit }: TreatmentsListProps) {
  const [items, setItems] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canEdit = Boolean(onEdit);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/treatments", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) throw new Error(body.error || "Failed to load treatments");
      setItems(body.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load treatments");
      toast.error(error instanceof Error ? error.message : "Failed to load treatments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("treatments:refresh", handler);
    return () => window.removeEventListener("treatments:refresh", handler);
  }, []);

  const deleteTreatment = async (treatment: Treatment) => {
    const confirmed = window.confirm(`Delete ${treatment.name}? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(treatment._id);
    try {
      const res = await fetch(`/api/treatments?id=${encodeURIComponent(treatment._id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body.error || "Failed to delete treatment");
      }
      setItems((prev) => prev.filter((item) => item._id !== treatment._id));
      toast.success("Treatment deleted");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete treatment";
      toast.error(message);
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Treatments</h3>
          <p className="text-sm text-muted-foreground">Consultations, procedures, and follow-ups.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No treatments yet.</p>
      ) : (
        <div className="divide-y max-h-[420px] overflow-y-auto pr-1">
          {items.map((t) => (
            <div key={t._id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{t.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t.code || "No code"} • {t.type || "consultation"}</p>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
              </div>
              <div className="text-right space-y-2">
                <p className="font-semibold text-foreground">{t.currency} {t.price}</p>
                {t.durationMinutes ? <p className="text-xs text-muted-foreground">{t.durationMinutes} min</p> : null}
                {canEdit ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit?.(t)}
                      className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTreatment(t)}
                      disabled={deletingId === t._id}
                      className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === t._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
