"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/** Polling interval for appointment refresh (ms) */
const POLL_MS = 30_000;

type PatientLite = {
  _id: string;
  firstName?: string;
  lastName?: string;
  patientCode?: string;
  phone?: string;
};

type DentistLite = {
  _id: string;
  name?: string;
  email?: string;
};

type Appt = {
  _id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  type: string;
  notes?: string;
  patient?: string | PatientLite | null;
  dentist?: string | DentistLite | null;
};

interface AppointmentsAttentionBannerProps {
  /** If provided, only show appointments for this dentist ID */
  dentistId?: string;
  /** Whether to show quick-action buttons (check-in, no-show, cancel). Default true. */
  showActions?: boolean;
}

/**
 * A reusable banner that shows scheduled appointments whose start time has
 * already passed but haven't been checked-in yet — "appointments that need
 * attention". Designed for receptionist, dentist, and admin dashboards.
 */
export default function AppointmentsAttentionBanner({
  dentistId,
  showActions = true,
}: AppointmentsAttentionBannerProps) {
  const [items, setItems] = useState<Appt[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const notifiedRef = useRef<Set<string>>(new Set());

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments", { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      setItems(body.data ?? []);
    } catch {
      // silent
    }
  }, []);

  // Initial load + periodic poll
  useEffect(() => {
    reload();
    const id = window.setInterval(() => {
      setNow(new Date());
      reload();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  const startingNow = useMemo(() => {
    let filtered = items.filter(
      (appt) =>
        appt.status === "scheduled" &&
        appt.start &&
        new Date(appt.start) <= now
    );

    // If a dentistId filter was provided, only show that dentist's appointments
    if (dentistId) {
      filtered = filtered.filter((appt) => {
        const d = appt.dentist;
        const dId = typeof d === "object" ? d?._id : d;
        return dId === dentistId;
      });
    }

    return filtered.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [items, now, dentistId]);

  // Toast newly detected starting alerts once each
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
      setItems((prev) =>
        prev.map((a) =>
          a._id === payload.data?._id ? { ...a, ...payload.data } : a
        )
      );
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

  if (startingNow.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <h4 className="text-sm font-semibold text-amber-900">
          {startingNow.length} appointment
          {startingNow.length === 1 ? "" : "s"} need attention
        </h4>
      </div>
      <ul className="divide-y divide-amber-200">
        {startingNow.map((appt) => {
          const phone = patientPhone(appt.patient);
          return (
            <li
              key={appt._id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900">
                  {appt.title}
                </p>
                <p className="text-xs text-amber-800">
                  {patientLabel(appt.patient)} · scheduled{" "}
                  {new Date(appt.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {phone ? ` · ${phone}` : ""}
                </p>
              </div>
              {showActions && (
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
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
