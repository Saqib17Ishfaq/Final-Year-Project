"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type TreatmentFormValue = {
  _id?: string;
  name: string;
  code: string;
  description: string;
  price: string;
  currency: string;
  durationMinutes: string;
  type: "consultation" | "procedure" | "followup";
  active: boolean;
};

const initialState: TreatmentFormValue = {
  name: "",
  code: "",
  description: "",
  price: "",
  currency: "PKR",
  durationMinutes: "",
  type: "consultation" as "consultation" | "procedure" | "followup",
  active: true,
};

type TreatmentFormProps = {
  treatment?: TreatmentFormValue | null;
  onSaved?: () => void;
  onAddNew?: () => void;
};

export function TreatmentForm({ treatment, onSaved, onAddNew }: TreatmentFormProps) {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (treatment) {
      setForm({
        _id: treatment._id,
        name: treatment.name || "",
        code: treatment.code || "",
        description: treatment.description || "",
        price: treatment.price || "",
        currency: treatment.currency || "PKR",
        durationMinutes: treatment.durationMinutes || "",
        type: treatment.type || "consultation",
        active: treatment.active !== false,
      });
      setError(null);
      setSuccess(null);
      return;
    }

    setForm(initialState);
  }, [treatment]);

  const handleChange = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price) {
      setError("Name and price are required");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/treatments", {
        method: form._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form._id,
          name: form.name.trim(),
          code: form.code || undefined,
          description: form.description || undefined,
          price: Number(form.price),
          currency: form.currency || "PKR",
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
          type: form.type,
          active: form.active,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) throw new Error(body.error || "Failed to save treatment");
      setSuccess(form._id ? "Updated" : "Saved");
      setForm(initialState);
      window.dispatchEvent(new CustomEvent("treatments:refresh"));
      onSaved?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save treatment");
      toast.error(error instanceof Error ? error.message : "Failed to save treatment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{form._id ? "Edit Treatment" : "Add Treatment"}</h3>
        <p className="text-sm text-muted-foreground">Define consultations or procedures with pricing.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-foreground">Name</label>
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Consultation"
          />
        </div>
        <div>
          <label className="text-sm text-foreground">Code (optional)</label>
          <input
            value={form.code}
            onChange={(e) => handleChange("code", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="CONS-01"
          />
        </div>
        <div>
          <label className="text-sm text-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Short note"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-foreground">Price</label>
            <input
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="1500"
              type="number"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm text-foreground">Currency</label>
            <input
              value={form.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="PKR"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-foreground">Duration (minutes)</label>
            <input
              value={form.durationMinutes}
              onChange={(e) => handleChange("durationMinutes", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="30"
              type="number"
              min="0"
            />
          </div>
          <div>
            <label className="text-sm text-foreground">Type</label>
            <select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="consultation">Consultation</option>
              <option value="procedure">Procedure</option>
              <option value="followup">Follow-up</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => handleChange("active", e.target.checked)}
          />
          <span className="text-sm text-foreground">Active</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-blue-600 text-white rounded px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : form._id ? "Update treatment" : "Save treatment"}
        </button>
        {form._id && (
          <button
            onClick={() => {
              setForm(initialState);
              setError(null);
              setSuccess(null);
              onAddNew?.();
            }}
            className="w-full rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            Add new treatment
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </div>
    </div>
  );
}
