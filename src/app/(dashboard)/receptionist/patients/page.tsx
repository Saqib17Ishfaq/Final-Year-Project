"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import PatientForm from "@/components/features/patients/patient-form";

type Patient = {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  medicalHistory?: string[];
  [key: string]: any;
};

export default function ReceptionistPatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/patients", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        if (active) setItems(data.data ?? []);
      } catch (err: any) {
        if (active) setError(err.message);
        toast.error(err.message || "Failed to load patients");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-foreground">All patients</h3>
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <div className="divide-y">
          {loading && items.length === 0 && (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-muted rounded"></div>
                    <div className="h-3 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-32 bg-muted rounded"></div>
                  </div>
                  <div className="h-8 w-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          )}
          {items.length === 0 && !loading && !error && (
            <div className="p-4 text-sm text-muted-foreground">No patients found.</div>
          )}
          {items.map((p) => (
            <div key={p._id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{p.firstName} {p.lastName}</p>
                <p className="text-xs text-muted-foreground">{p.email || "No email"}</p>
                <p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <button
                  onClick={() => setEditing(p)}
                  className="px-3 py-1 rounded border border-gray-200 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--accent)] transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-card shadow-xl border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-semibold">Edit patient</h3>
              <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              <PatientForm onCancel={() => setEditing(null)} initialData={editing} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
