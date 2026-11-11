"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/format-number";
import { toast } from "sonner";

const capitalize = (value?: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

type Patient = {
  _id: string;
  patientCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

type Dentist = {
  _id: string;
  name: string;
  email: string;
};

type PatientPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
};

type ApptPayload = {
  title: string;
  type: "checkup" | "cleaning" | "x-ray" | "surgery" | "ortho" | "other";
  notes?: string;
  patientId?: string;
  dentistId?: string;
  treatmentId?: string;
  start: string;
  end: string;
};

type Appointment = {
  _id: string;
  title: string;
  start: string;
  end: string;
  status: "scheduled" | "checked-in" | "in-treatment" | "completed" | "cancelled" | "no-show";
  type: string;
  notes?: string;
  treatment?: Treatment | string;
  fee?: number;
  currency?: string;
  checkedInAt?: string;
  seatedAt?: string;
  completedAt?: string;
  patient?: Patient | string;
  dentist?: Dentist | string;
};

type Treatment = {
  _id: string;
  name: string;
  active?: boolean;
};

export default function ReceptionistDashboard() {
  const [openPatient, setOpenPatient] = useState(false);
  const [openAppt, setOpenAppt] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientPayload>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: new Date().toISOString().slice(0, 10),
    gender: "other",
  });
  
  // Helper to get default start/end times (now + 1 hour)
  const getDefaultTimes = () => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      start: now.toISOString().slice(0, 16),
      end: inOneHour.toISOString().slice(0, 16),
    };
  };

  const [apptForm, setApptForm] = useState<ApptPayload>(() => {
    const times = getDefaultTimes();
    return {
      title: "",
      type: "checkup",
      notes: "",
      start: times.start,
      end: times.end,
    };
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [defaultDentistId, setDefaultDentistId] = useState<string | undefined>(undefined);
  const [recentPatient, setRecentPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [patientsRes, usersRes, apptsRes, treatmentsRes] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/treatments", { cache: "no-store" }),
        ]);

        const [patientsBody, usersBody, apptsBody, treatmentsBody] = await Promise.all([
          patientsRes.json(),
          usersRes.json(),
          apptsRes.json(),
          treatmentsRes.json(),
        ]);

        if (!patientsRes.ok) throw new Error(patientsBody.error || "Failed to load patients");
        if (!usersRes.ok) throw new Error(usersBody.error || "Failed to load users");
        if (!apptsRes.ok) throw new Error(apptsBody.error || "Failed to load appointments");
        if (!treatmentsRes.ok) throw new Error(treatmentsBody.error || "Failed to load treatments");

        setPatients(patientsBody.data ?? []);
        const dentistsList = (usersBody.data ?? []).filter((u: any) => u.role === "dentist");
        setDentists(dentistsList);
        if (dentistsList[0]?._id) setDefaultDentistId(dentistsList[0]._id);
        setAppointments(apptsBody.data ?? []);
        setTreatments((treatmentsBody.data ?? []).filter((t: any) => t.active !== false));
      } catch (err: any) {
        setError(err?.message || "Unable to load receptionist data");
        toast.error(err?.message || "Unable to load receptionist data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Lightweight polling to keep all screens in sync without manual reloads
  useEffect(() => {
    const id = setInterval(() => {
      refreshData();
    }, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!apptForm.dentistId && dentists.length > 0) {
      setApptForm((prev) => ({ ...prev, dentistId: prev.dentistId ?? dentists[0]._id }));
    }
  }, [dentists]);

  useEffect(() => {
    if (!apptForm.patientId && patients.length > 0) {
      setApptForm((prev) => ({ ...prev, patientId: prev.patientId ?? patients[0]._id }));
    }
    if (!apptForm.treatmentId && treatments.length > 0) {
      setApptForm((prev) => ({ ...prev, treatmentId: prev.treatmentId ?? treatments[0]._id, title: prev.title || treatments[0].name }));
    }
  }, [patients, treatments]);

  const todayAppointments = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return appointments.filter((appt) => {
      const start = new Date(appt.start);
      return start >= startOfDay && start <= endOfDay;
    });
  }, [appointments]);

  const remainingTodayAppointments = useMemo(
    () => todayAppointments.filter((appt) => appt.status !== "completed" && appt.status !== "cancelled" && appt.status !== "no-show"),
    [todayAppointments]
  );

  const checkInsPending = useMemo(() => todayAppointments.filter((a) => a.status === "scheduled").length, [todayAppointments]);
  const waitingCount = useMemo(() => todayAppointments.filter((a) => a.status === "checked-in").length, [todayAppointments]);
  const todaysCount = remainingTodayAppointments.length;

  const refreshData = async () => {
    try {
      const [patientsRes, apptsRes] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/appointments", { cache: "no-store" }),
      ]);
      const [patientsBody, apptsBody] = await Promise.all([patientsRes.json(), apptsRes.json()]);
      if (patientsRes.ok) setPatients(patientsBody.data ?? []);
      if (apptsRes.ok) setAppointments(apptsBody.data ?? []);
    } catch (err) {
      console.error("Failed to refresh receptionist data", err);
      toast.error("Could not refresh the front desk data.");
    }
  };

  const updateAppointment = async (
    apptId: string,
    status: Appointment["status"],
    extra: Record<string, any> = {}
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) throw new Error(body.error || "Failed to update appointment");
      await refreshData();
      setMessage(`Appointment ${capitalize(status)}.`);
    } catch (err: any) {
      setMessage(err.message || "Unable to update appointment");
      toast.error(err.message || "Unable to update appointment");
    } finally {
      setBusy(false);
    }
  };

  const statusStyle: Record<Appointment["status"], { text: string; bg: string; border: string }> = {
    scheduled: { text: "text-blue-800", bg: "bg-blue-100", border: "" },
    "checked-in": { text: "text-teal-800", bg: "bg-teal-100", border: "" },
    "in-treatment": { text: "text-amber-800", bg: "bg-amber-100", border: "" },
    completed: { text: "text-emerald-800", bg: "bg-emerald-100", border: "" },
    cancelled: { text: "text-slate-700", bg: "bg-slate-100", border: "" },
    "no-show": { text: "text-purple-800", bg: "bg-purple-100", border: "" },
  };

  const submitPatient = async () => {
    if (!patientForm.firstName || !patientForm.lastName) {
      setMessage("Please fill first name and last name.");
      return;
    }
    if (!defaultDentistId) {
      setMessage("No dentist available to assign.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        ...patientForm,
        dateOfBirth: new Date(patientForm.dateOfBirth).toISOString(),
        medicalHistory: [],
        dentist: defaultDentistId,
      };
      const res = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to create patient");
      const body = await res.json();
      setMessage("Patient created");
      const created = body?.data as Patient | undefined;
      setRecentPatient(created || null);
      refreshData();
      setOpenPatient(false);
      setPatientForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: new Date().toISOString().slice(0, 10),
        gender: "other",
      });
      if (created?._id) {
        setApptForm((prev) => ({ ...prev, patientId: created._id }));
        setOpenAppt(true);
      }
    } catch (err: any) {
      setMessage(err.message);
      toast.error(err.message || "Failed to create patient");
    } finally {
      setBusy(false);
    }
  };

  const submitAppt = async () => {
    if (!apptForm.patientId || !apptForm.dentistId || !apptForm.title) {
      setMessage("Please fill title, patient, and dentist.");
      return;
    }
    if (!apptForm.start || !apptForm.end) {
      setMessage("Please select start and end time.");
      return;
    }
    const startD = new Date(apptForm.start);
    const endD = new Date(apptForm.end);
    if (startD.getHours() < 8) {
      setMessage("Appointments must be scheduled between 8 AM and 12 AM.");
      return;
    }
    if (endD.getHours() < 8 && endD.getHours() !== 0) {
      setMessage("Appointments must end by 12 AM.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const selectedTreatment = treatments.find((t) => t._id === apptForm.treatmentId);
      const patientObj = patients.find((p) => p._id === apptForm.patientId);
      const patientName = patientObj ? `${patientObj.firstName} ${patientObj.lastName}` : "Patient";
      const finalType = selectedTreatment ? "other" : apptForm.type;
      const finalTitle = apptForm.title.trim() || `${patientName} - ${selectedTreatment?.name || finalType}`;

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: apptForm.patientId,
          dentist: apptForm.dentistId,
          status: "scheduled",
          title: finalTitle,
          type: finalType,
          treatmentId: selectedTreatment?._id,
          notes: apptForm.notes,
          start: new Date(apptForm.start).toISOString(),
          end: new Date(apptForm.end).toISOString(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create appointment");
      }
      setMessage("Appointment created");
      refreshData();
      setOpenAppt(false);
      const times = getDefaultTimes();
      setApptForm({
        title: "",
        type: "checkup",
        notes: "",
        patientId: patients[0]?._id,
        dentistId: dentists[0]?._id,
        treatmentId: treatments[0]?._id,
        start: times.start,
        end: times.end,
      });
    } catch (err: any) {
      setMessage(err.message);
      toast.error(err.message || "Failed to create appointment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        {message && <p className="text-sm text-emerald-600 mt-2">{message}</p>}
        {recentPatient && (
          <div className="mt-3 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/60 px-4 py-3 text-sm text-[var(--accent-foreground)] flex items-center justify-between">
            <span>
              Patient {recentPatient.firstName} {recentPatient.lastName} added. Book an appointment?
            </span>
            <button
              onClick={() => {
                const times = getDefaultTimes();
                setApptForm((prev) => ({ ...prev, patientId: recentPatient._id, start: times.start, end: times.end }));
                setOpenAppt(true);
              }}
              className="ml-3 rounded bg-[var(--primary)] px-3 py-1 text-white text-xs hover:opacity-90"
            >
              Book now
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Check-ins pending</p>
          <p className="text-2xl font-bold">{loading ? "…" : formatNumber(checkInsPending)}</p>
          <p className="text-xs text-orange-600 mt-1">Scheduled arrivals not checked in</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Today’s appointments</p>
          <p className="text-2xl font-bold">{loading ? "…" : formatNumber(todaysCount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Auto-updates from live schedule</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Waiting room</p>
          <p className="text-2xl font-bold">{loading ? "…" : formatNumber(waitingCount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Scheduled and arrived time reached</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-foreground">Quick actions</h3>
        </div>
        <div className="p-5 grid gap-3 md:grid-cols-2">
          <button
            onClick={() => {
              // Refresh default times when opening modal
              const times = getDefaultTimes();
              setApptForm((prev) => ({ ...prev, start: times.start, end: times.end }));
              setOpenAppt(true);
            }}
            className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-left hover:border-blue-400 hover:bg-blue-100 transition-colors"
          >
            <p className="font-semibold text-blue-900">Book a new appointment</p>
            <p className="text-sm text-blue-700">Find a slot and assign a provider</p>
          </button>
          <button
            onClick={() => setOpenPatient(true)}
            className="rounded-lg border border-dashed border-teal-200 bg-teal-50 p-4 text-left hover:border-teal-400 hover:bg-teal-100 transition-colors"
          >
            <p className="font-semibold text-teal-900">Register a new patient</p>
            <p className="text-sm text-teal-700">Capture contact and insurance details</p>
          </button>
        </div>
      </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Today’s schedule</h3>
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>
          <div className="divide-y">
            {!loading && remainingTodayAppointments.length === 0 && (
              <div className="p-5 text-sm text-muted-foreground">No appointments scheduled for today.</div>
            )}
            {remainingTodayAppointments.map((appt) => {
              const patientName =
                typeof appt.patient === "string"
                  ? appt.patient
                  : appt.patient
                  ? `${appt.patient.firstName} ${appt.patient.lastName}`
                  : "Unknown patient";
              const dentistName =
                typeof appt.dentist === "string"
                  ? appt.dentist
                  : appt.dentist?.name || "Unassigned";
              const treatmentName =
                typeof appt.treatment === "string"
                  ? appt.treatment
                  : appt.treatment?.name || undefined;
              const statusBadge = statusStyle[appt.status];
              return (
                <div key={appt._id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{appt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(appt.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-muted-foreground">Patient: {patientName}</p>
                    <p className="text-xs text-muted-foreground">Dentist: {dentistName}</p>
                    {treatmentName && <p className="text-xs text-muted-foreground">Treatment: {treatmentName}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusBadge?.text || ""} ${statusBadge?.bg || ""}`}
                    >
                      {capitalize(appt.status)}
                    </span>
                    {appt.status === "scheduled" && (
                      <button
                        disabled={busy}
                        onClick={() => updateAppointment(appt._id, "checked-in")}
                        className="text-xs px-3 py-1 rounded border border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      >
                        Check-in
                      </button>
                    )}
                    {appt.status === "checked-in" && (
                      <button
                        disabled={busy}
                        onClick={() => updateAppointment(appt._id, "in-treatment")}
                        className="text-xs px-3 py-1 rounded border border-blue-300 text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                      >
                        Seat patient
                      </button>
                    )}
                    {appt.status === "in-treatment" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          const feeInput = window.prompt("Mark complete. Enter fee (optional):", appt.fee?.toString() || "");
                          const parsed = feeInput ? Number(feeInput) : undefined;
                          updateAppointment(appt._id, "completed", isNaN(parsed as number) ? {} : { fee: parsed });
                        }}
                        className="text-xs px-3 py-1 rounded border border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                    {(appt.status === "scheduled" || appt.status === "checked-in") && (
                      <button
                        disabled={busy}
                        onClick={() => updateAppointment(appt._id, "no-show")}
                        className="text-xs px-3 py-1 rounded border border-rose-300 text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                      >
                        No-show
                      </button>
                    )}
                    {appt.status !== "completed" && appt.status !== "cancelled" && appt.status !== "no-show" && (
                      <button
                        disabled={busy}
                        onClick={() => updateAppointment(appt._id, "cancelled")}
                        className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Patient modal */}
      {openPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Register patient</h3>
              <button onClick={() => setOpenPatient(false)} className="text-sm text-muted-foreground">Close</button>
            </div>
            <div className="grid gap-3">
              <input className="rounded border p-2" placeholder="First name" value={patientForm.firstName} onChange={(e) => setPatientForm({ ...patientForm, firstName: e.target.value })} />
              <input className="rounded border p-2" placeholder="Last name" value={patientForm.lastName} onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })} />
              <input className="rounded border p-2" placeholder="Email" value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} />
              <input className="rounded border p-2" placeholder="Phone" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} />
              <label className="text-xs text-muted-foreground">Date of birth</label>
              <input type="date" className="rounded border p-2" value={patientForm.dateOfBirth} onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })} />
              <label className="text-xs text-muted-foreground">Gender</label>
              <select className="rounded border p-2" value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as PatientPayload["gender"] })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpenPatient(false)} className="px-4 py-2 text-sm rounded border">Cancel</button>
              <button disabled={busy} onClick={submitPatient} className="px-4 py-2 text-sm rounded bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment modal */}
      {openAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Book appointment</h3>
              <button onClick={() => setOpenAppt(false)} className="text-sm text-muted-foreground">Close</button>
            </div>
            <div className="grid gap-3">
              <label className="text-xs text-muted-foreground">Treatment</label>
              <select
                className="rounded border p-2"
                value={apptForm.treatmentId || ""}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const t = treatments.find((tr) => tr._id === nextId);
                  setApptForm((prev) => ({ ...prev, treatmentId: nextId, title: t?.name || prev.title, type: "other" }));
                }}
              >
                {treatments.map((t) => (
                  <option key={t._id} value={t._id}>
                    {capitalize(t.name)}
                  </option>
                ))}
                {treatments.length === 0 && <option value="">No treatments available</option>}
              </select>
              
              {/* Date/Time fields */}
              <label className="text-xs text-muted-foreground">Start</label>
              <input
                type="datetime-local"
                className="rounded border p-2 w-full"
                value={apptForm.start}
                onChange={(e) => setApptForm({ ...apptForm, start: e.target.value })}
              />

              <textarea className="rounded border p-2" placeholder="Notes" value={apptForm.notes} onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })} />
              <label className="text-xs text-muted-foreground">Patient</label>
              <select
                className="rounded border p-2"
                value={apptForm.patientId || ""}
                onChange={(e) => setApptForm({ ...apptForm, patientId: e.target.value })}
              >
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>{`${p.firstName} ${p.lastName}`}</option>
                ))}
                {patients.length === 0 && <option value="">No patients available</option>}
              </select>
              <label className="text-xs text-muted-foreground">Dentist</label>
              <select
                className="rounded border p-2"
                value={apptForm.dentistId || ""}
                onChange={(e) => setApptForm({ ...apptForm, dentistId: e.target.value })}
              >
                {dentists.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
                {dentists.length === 0 && <option value="">No dentists found</option>}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpenAppt(false)} className="px-4 py-2 text-sm rounded border">Cancel</button>
              <button disabled={busy} onClick={submitAppt} className="px-4 py-2 text-sm rounded bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
