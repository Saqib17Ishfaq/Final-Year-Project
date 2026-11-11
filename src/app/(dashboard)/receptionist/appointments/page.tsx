"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Poll every 30s so "starting now" alerts surface promptly without blowing up
// the API. Toast each appointment only once per session.
const POLL_MS = 30_000;

const APPOINTMENT_TYPES = ["checkup", "cleaning", "x-ray", "surgery", "ortho", "other"] as const;
const APPOINTMENT_STATUSES = ["scheduled", "checked-in", "in-treatment", "completed", "cancelled", "no-show"] as const;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#2563eb",
  "checked-in": "#0d9488",
  "in-treatment": "#d97706",
  completed: "#16a34a",
  cancelled: "#64748b",
  "no-show": "#9333ea",
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

type Treatment = { _id: string; name: string; price?: number; currency?: string };
type Dentist = { _id: string; name?: string; email?: string };
type PatientLite = {
  _id: string;
  firstName?: string;
  lastName?: string;
  patientCode?: string;
  phone?: string;
};

type Appt = {
  _id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  type: string;
  notes?: string;
  treatment?: string | Treatment | null;
  dentist?: string | Dentist | null;
  patient?: string | PatientLite | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appt;
};

const toLocalInput = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (value: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
};

const idOf = (value?: string | { _id?: string } | null) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
};

export default function ReceptionistAppointmentsPage() {
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [saving, setSaving] = useState(false);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);

  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("checkup");
  const [formStatus, setFormStatus] = useState("scheduled");
  const [formNotes, setFormNotes] = useState("");
  const [formPatientId, setFormPatientId] = useState("");

  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState<Date>(new Date());

  // Week/Month views are unreadable on a phone (7 columns + time gutter), so
  // start on Day for narrow viewports. The user can still switch via the
  // calendar toolbar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 640px)").matches) {
      setView(Views.DAY);
    }
  }, []);

  // Edit form state
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formTreatmentId, setFormTreatmentId] = useState("");
  const [formDentistId, setFormDentistId] = useState("");

  // Notification tick — bumped every poll so derived "starting now" recomputes.
  const [now, setNow] = useState<Date>(() => new Date());
  // Track which appointments we've already toasted so we don't re-alert.
  const notifiedRef = useRef<Set<string>>(new Set());

  const reloadAppointments = useCallback(async () => {
    try {
      const apptRes = await fetch("/api/appointments", { cache: "no-store" });
      if (!apptRes.ok) throw new Error("Failed to load appointments");
      const apptData = await apptRes.json();
      setItems(apptData.data ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [apptRes, treatmentsRes, usersRes, patientsRes] = await Promise.all([
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/treatments", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/patients", { cache: "no-store" }),
        ]);
        if (!apptRes.ok) throw new Error("Failed to load appointments");
        const apptData = await apptRes.json();
        const treatmentsData = treatmentsRes.ok ? await treatmentsRes.json() : { data: [] };
        const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
        const patientsData = patientsRes.ok ? await patientsRes.json() : { data: [] };
        if (!active) return;
        setItems(apptData.data ?? []);
        setTreatments((treatmentsData.data ?? []).filter((t: any) => t?.active !== false));
        setDentists((usersData.data ?? []).filter((u: any) => u?.role === "dentist"));
        setPatients(patientsData.data ?? []);
      } catch (err: any) {
        if (active) setError(err.message);
        toast.error(err.message || "Failed to load appointments");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Poll the appointments list and the wall-clock so "starting now" alerts
  // appear without a manual refresh.
  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      reloadAppointments();
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [reloadAppointments]);

  const events = useMemo<CalendarEvent[]>(
    () =>
      items
        .filter((appt) => appt.start && appt.end)
        .map((appt) => ({
          id: appt._id,
          title: appt.title,
          start: new Date(appt.start),
          end: new Date(appt.end),
          resource: appt,
        })),
    [items],
  );

  // "Starting now" alerts: scheduled appointments whose start time has come.
  // Excludes anything already actioned (checked-in / cancelled / no-show / etc.)
  // because once the receptionist picks an outcome the alert should clear.
  const startingNow = useMemo(
    () =>
      items
        .filter((appt) => appt.status === "scheduled" && appt.start && new Date(appt.start) <= now)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [items, now],
  );

  // Toast newly-detected starting alerts once each.
  useEffect(() => {
    startingNow.forEach((appt) => {
      if (notifiedRef.current.has(appt._id)) return;
      notifiedRef.current.add(appt._id);
      toast.warning(`Appointment starting: ${appt.title}`, {
        description: "Patient hasn't checked in yet.",
        duration: 8000,
      });
    });
  }, [startingNow]);

  const eventPropGetter = (event: CalendarEvent) => {
    const status = event.resource?.status || "scheduled";
    const backgroundColor = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
    return {
      style: {
        backgroundColor,
        borderRadius: 6,
        border: "none",
        color: "#fff",
        padding: "1px 4px",
        fontSize: 12,
      },
    };
  };

  const openEdit = (appt: Appt) => {
    setEditing(appt);
    setFormStart(toLocalInput(appt.start));
    setFormEnd(toLocalInput(appt.end));
    setFormTreatmentId(idOf(appt.treatment));
    setFormDentistId(idOf(appt.dentist));
  };

  const closeEdit = () => {
    setEditing(null);
    setFormStart("");
    setFormEnd("");
    setFormTreatmentId("");
    setFormDentistId("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (formStart && formEnd && new Date(formEnd) <= new Date(formStart)) {
      toast.error("End time must be after start time.");
      return;
    }
    if (formStart) {
      const d = new Date(formStart);
      if (d.getHours() < 8) { toast.error("Appointments must be between 8 AM and 12 AM."); return; }
    }
    if (formEnd) {
      const d = new Date(formEnd);
      if (d.getHours() < 8 && d.getHours() !== 0) { toast.error("Appointments must end by 12 AM."); return; }
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        status: editing.status,
        notes: editing.notes,
        type: editing.type,
      };
      if (formStart) body.start = fromLocalInput(formStart);
      if (formEnd) body.end = fromLocalInput(formEnd);
      if (formTreatmentId) body.treatmentId = formTreatmentId;
      if (formDentistId) body.dentist = formDentistId;

      const res = await fetch(`/api/appointments/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to update appointment");
      }
      const data = payload.data;
      setItems((prev) => prev.map((a) => (a._id === data._id ? { ...a, ...data } : a)));
      toast.success("Appointment updated.");
      closeEdit();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to update appointment");
    } finally {
      setSaving(false);
    }
  };

  const sortedDentists = useMemo(
    () => [...dentists].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [dentists],
  );

  const openCreate = () => {
    setCreating(true);
    setFormTitle("");
    setFormType("checkup");
    setFormStatus("scheduled");
    setFormNotes("");
    setFormPatientId("");
    setFormStart("");
    setFormEnd("");
    setFormTreatmentId("");
    setFormDentistId("");
  };

  const closeCreate = () => {
    setCreating(false);
  };

  const saveCreate = async () => {
    if (!formStart || !formEnd || !formPatientId) {
      toast.error("Please fill required fields: Start, End, and Patient.");
      return;
    }
    if (new Date(formEnd) <= new Date(formStart)) {
      toast.error("End time must be after start time.");
      return;
    }
    const startD = new Date(formStart);
    const endD = new Date(formEnd);
    if (startD.getHours() < 8) {
      toast.error("Appointments must be scheduled between 8 AM and 12 AM.");
      return;
    }
    if (endD.getHours() < 8 && endD.getHours() !== 0) {
      toast.error("Appointments must end by 12 AM.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const p = patients.find((x) => x._id === formPatientId);
      const patientName = p ? `${p.firstName} ${p.lastName}` : "Patient";
      const t = treatments.find((x) => x._id === formTreatmentId);
      const treatmentName = t ? t.name : formType;
      const finalTitle = formTitle.trim() || `${patientName} - ${treatmentName}`;

      const body: Record<string, unknown> = {
        title: finalTitle,
        type: formType,
        status: formStatus,
        notes: formNotes,
        start: fromLocalInput(formStart),
        end: fromLocalInput(formEnd),
        patient: formPatientId,
      };
      if (formTreatmentId) body.treatmentId = formTreatmentId;
      if (formDentistId) body.dentist = formDentistId;

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to create appointment");
      }
      setItems((prev) => [...prev, payload.data]);
      toast.success("Appointment created.");
      closeCreate();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };

  // Quick status change without opening the full edit modal — used by the
  // "starting now" alert banner actions.
  const quickUpdateStatus = async (apptId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to update appointment");
      }
      const data = payload.data;
      setItems((prev) => prev.map((a) => (a._id === data._id ? { ...a, ...data } : a)));
      toast.success(`Marked as ${nextStatus.replace("-", " ")}.`);
    } catch (err: any) {
      toast.error(err?.message || "Could not update appointment.");
    }
  };

  const patientLabel = (value: Appt["patient"]) => {
    if (!value || typeof value === "string") return "Patient";
    const name = `${value.firstName || ""} ${value.lastName || ""}`.trim();
    return name || value.patientCode || "Patient";
  };

  const patientPhone = (value: Appt["patient"]) =>
    value && typeof value === "object" ? value.phone : undefined;

  return (
    <div className="space-y-4">
      {startingNow.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <h4 className="text-sm font-semibold text-amber-900">
              {startingNow.length} appointment{startingNow.length === 1 ? "" : "s"} need attention
            </h4>
          </div>
          <ul className="divide-y divide-amber-200">
            {startingNow.map((appt) => {
              const phone = patientPhone(appt.patient);
              return (
                <li key={appt._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-900">{appt.title}</p>
                    <p className="text-xs text-amber-800">
                      {patientLabel(appt.patient)} · scheduled{" "}
                      {new Date(appt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {phone ? ` · ${phone}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="rounded border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Call
                      </a>
                    )}
                    <button
                      onClick={() => quickUpdateStatus(appt._id, "checked-in")}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Check in
                    </button>
                    <button
                      onClick={() => quickUpdateStatus(appt._id, "no-show")}
                      className="rounded border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      No-show
                    </button>
                    <button
                      onClick={() => quickUpdateStatus(appt._id, "cancelled")}
                      className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm min-w-0 w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">Appointments</h3>
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {APPOINTMENT_STATUSES.map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  <span className="capitalize">{status}</span>
                </span>
              ))}
            </div>
            <button
              onClick={() => setDate(new Date())}
              className="text-xs px-3 py-1 rounded border border-gray-200 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--accent)] transition-colors"
            >
              Today
            </button>
            <button
              onClick={openCreate}
              className="text-xs px-3 py-1 rounded bg-[var(--primary)] text-white hover:opacity-90 transition-colors shadow-sm"
            >
              New Appointment
            </button>
          </div>
        </div>
        <div className="h-[360px] sm:h-[640px] p-2 sm:p-4">
          <div className="h-full">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              view={view}
              date={date}
              onView={(nextView) => setView(nextView)}
              onNavigate={(nextDate) => setDate(nextDate)}
              views={[Views.MONTH, Views.WEEK, Views.DAY]}
            popup
            eventPropGetter={eventPropGetter}
            onSelectEvent={(event: CalendarEvent) => openEdit(event.resource)}
            onDrillDown={(nextDate) => {
              setDate(nextDate);
              setView(Views.DAY);
            }}
            min={new Date(1970, 0, 1, 8, 0, 0)}
            max={new Date(1970, 0, 1, 23, 59, 59)}
          />
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit appointment</h3>
              <button onClick={closeEdit} className="text-sm text-muted-foreground">Close</button>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border p-2 text-sm"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">End</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border p-2 text-sm"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Treatment</label>
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={formTreatmentId}
                  onChange={(e) => setFormTreatmentId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {treatments.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                      {typeof t.price === "number" ? ` (${t.currency || "PKR"} ${t.price})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Dentist</label>
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={formDentistId}
                  onChange={(e) => setFormDentistId(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {sortedDentists.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name || d.email || d._id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    className="w-full rounded border p-2 text-sm capitalize"
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  >
                    {APPOINTMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select
                    className="w-full rounded border p-2 text-sm capitalize"
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  >
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  className="w-full rounded border p-2 text-sm"
                  rows={3}
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-between items-center gap-2">
              <button
                disabled={saving}
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete this appointment?")) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/appointments/${editing._id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Failed to delete appointment");
                    setItems((prev) => prev.filter((a) => a._id !== editing._id));
                    toast.success("Appointment deleted.");
                    closeEdit();
                  } catch (err: any) {
                    toast.error(err.message || "Failed to delete");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-2 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="px-4 py-2 text-sm rounded border">Cancel</button>
                <button
                  disabled={saving}
                  onClick={saveEdit}
                  className="px-4 py-2 text-sm rounded bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-semibold">Create Appointment</h3>
               <button onClick={closeCreate} className="text-sm text-muted-foreground">Close</button>
            </div>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <input
                  className="w-full rounded border p-2 text-sm"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Initial Consultation"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Patient</label>
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                >
                  <option value="">— Select Patient —</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName} {p.patientCode ? `(${p.patientCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border p-2 text-sm"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">End</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border p-2 text-sm"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Treatment</label>
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={formTreatmentId}
                  onChange={(e) => setFormTreatmentId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {treatments.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Dentist</label>
                <select
                  className="w-full rounded border p-2 text-sm"
                  value={formDentistId}
                  onChange={(e) => setFormDentistId(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {sortedDentists.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name || d.email || d._id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    className="w-full rounded border p-2 text-sm capitalize"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    {APPOINTMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select
                    className="w-full rounded border p-2 text-sm capitalize"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                  >
                    {APPOINTMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  className="w-full rounded border p-2 text-sm"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
               <button onClick={closeCreate} className="px-4 py-2 text-sm rounded border">Cancel</button>
               <button
                 disabled={saving}
                 onClick={saveCreate}
                 className="px-4 py-2 text-sm rounded bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
               >
                 {saving ? "Creating…" : "Create"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
