"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarScheduler from "@/components/features/appointments/calendar-scheduler";
import SkeletonCard from "@/components/shared/skeleton-card";
import { toast } from "sonner";

type Appointment = {
  _id: string;
  title: string;
  start: string;
  end: string;
  status: "scheduled" | "checked-in" | "in-treatment" | "completed" | "cancelled" | "no-show";
  patient?: { firstName: string; lastName: string } | string;
  dentist?: { name: string; email: string } | string;
};

const capitalize = (value?: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

const statusStyle: Record<Appointment["status"], { text: string; bg: string }> = {
  scheduled: { text: "text-blue-800", bg: "bg-blue-100" },
  "checked-in": { text: "text-teal-800", bg: "bg-teal-100" },
  "in-treatment": { text: "text-amber-800", bg: "bg-amber-100" },
  completed: { text: "text-emerald-800", bg: "bg-emerald-100" },
  cancelled: { text: "text-slate-700", bg: "bg-slate-100" },
  "no-show": { text: "text-purple-800", bg: "bg-purple-100" },
};

export default function DentistSchedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const router = useRouter();

  const loadAppointments = async (silent = false) => {
    if (!silent && !hasLoadedRef.current) {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/appointments", { cache: "no-store" });
      const body = await res.json();
      if (res.ok) {
        setAppointments(body.data ?? []);
        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
        }
      }
    } catch (error) {
      console.error("Failed to load appointments", error);
      if (!silent) {
        toast.error("Could not load data. Please refresh the page.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAppointments();
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadAppointments(true);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const todayAppointments = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return (appointments || []).filter((appt) => {
      const start = new Date(appt.start);
      return start >= startOfDay && start <= endOfDay;
    });
  }, [appointments]);

  const remainingToday = useMemo(
    () =>
      todayAppointments.filter((appt) => {
        const status = (appt.status || "").toLowerCase();
        return status !== "completed" && status !== "cancelled" && status !== "no-show";
      }),
    [todayAppointments]
  );

  const updateAppointment = async (apptId: string, status: Appointment["status"], extra: Record<string, any> = {}) => {
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
      setMessage(`Marked ${capitalize(status)}.`);
      await loadAppointments(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update appointment");
      toast.error(error instanceof Error ? error.message : "Unable to update appointment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card shadow-sm" id="tour-schedule-list">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Today&apos;s patients</h3>
            {message && <span className="text-xs text-emerald-700">{message}</span>}
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-5 grid gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonCard key={index} lines={3} />
                ))}
              </div>
            ) : remainingToday.length === 0 && (
              <div className="p-5 text-sm text-muted-foreground">No appointments for today.</div>
            )}
            {remainingToday.map((appt) => {
              const patientName =
                typeof appt.patient === "string"
                  ? appt.patient
                  : appt.patient
                  ? `${appt.patient.firstName} ${appt.patient.lastName}`
                  : "Patient";
              const badge = statusStyle[appt.status];
              return (
                <div key={appt._id} className="p-5 flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{appt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(appt.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-muted-foreground">Patient: {patientName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${badge?.text || ""} ${badge?.bg || ""}`}>
                      {capitalize(appt.status)}
                    </span>
                    {(appt.status === "scheduled" || appt.status === "checked-in") && (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          await updateAppointment(appt._id, "in-treatment");
                          router.push(`/dentist/xray-lab?appointmentId=${appt._id}`);
                        }}
                        className="min-h-[44px] min-w-[44px] text-xs px-3 py-1 rounded border border-blue-300 text-blue-800 hover:bg-blue-50 disabled:opacity-50 touch-manipulation"
                      >
                        Start treatment
                      </button>
                    )}
                    {appt.status === "in-treatment" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          const feeInput = window.prompt("Mark complete. Enter fee (optional):", "");
                          const parsed = feeInput ? Number(feeInput) : undefined;
                          updateAppointment(appt._id, "completed", isNaN(parsed as number) ? {} : { fee: parsed });
                        }}
                        className="min-h-[44px] min-w-[44px] text-xs px-3 py-1 rounded border border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 touch-manipulation"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-4 min-w-0 overflow-hidden w-full" id="tour-schedule-calendar">
          {loading ? (
            <SkeletonCard className="min-h-[520px]" lines={5} />
          ) : (
            <CalendarScheduler />
          )}
        </div>
      </div>
    </div>
  );
}
