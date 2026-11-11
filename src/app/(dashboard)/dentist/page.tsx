"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredUser, type StoredUser } from "@/lib/user-storage";
import { formatNumber } from "@/lib/format-number";
import SkeletonCard from "@/components/shared/skeleton-card";
import { toast } from "sonner";

type Patient = { _id: string; firstName?: string; lastName?: string; patientCode?: string } | string | undefined;
type Dentist = { _id: string; name?: string; email?: string } | string | undefined;
type Appointment = {
  _id: string;
  title: string;
  start: string;
  end: string;
  status: "scheduled" | "checked-in" | "in-treatment" | "completed" | "cancelled" | "no-show";
  patient?: Patient;
  dentist?: Dentist;
  treatment?: { name?: string } | string;
};

export default function DentistDashboard() {
  const [currentUser, setCurrentUser] = useState<StoredUser>(() => getStoredUser());
  const [displayName, setDisplayName] = useState<string>(() => {
    const stored = getStoredUser();
    return stored?.name || "Dr. Smith";
  });
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    revenue: {} as Record<string, number>,
    todayAppointments: 0,
    waiting: 0,
    inTreatment: 0,
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.success === false) throw new Error(body.error || "Failed to load stats");
        setStats(body.data || stats);
      } catch (err) {
        console.error("Failed to load stats", err);
        toast.error("Could not load data. Please refresh the page.");
      }
    };

    const loadAppointments = async () => {
      try {
        const res = await fetch("/api/appointments", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.success === false) throw new Error(body.error || "Failed to load appointments");
        const data: Appointment[] = body.data || [];

        const mine = data.filter((appt) => {
          const dentist = appt.dentist;
          const dentistId = typeof dentist === "object" ? dentist?._id : dentist;
          const dentistEmail = typeof dentist === "object" ? dentist?.email : undefined;
          if (currentUser?.id && dentistId) return dentistId === currentUser.id;
          if (currentUser?.email && dentistEmail) return dentistEmail === currentUser.email;
          return true; // fallback: show all
        });

        setAppointments(mine);
      } catch (err) {
        console.error("Failed to load appointments", err);
        toast.error("Could not load appointments. Please refresh the page.");
      }
    };
    const loadAll = async () => {
      await Promise.all([loadStats(), loadAppointments()]);
      setIsInitialLoad(false);
    };

    // Initial load
    loadAll();

    // Subsequent polling (silent refresh - no loading indicators)
    const id = setInterval(loadAll, 5000);
    return () => clearInterval(id);
  }, [currentUser?.id, currentUser?.email]);

  const todaysAppointments = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return appointments
      .filter((appt) => {
        const start = new Date(appt.start);
        return start >= startOfDay && start <= endOfDay;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [appointments]);

  const recentActivity = useMemo(() => {
    return [...appointments]
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 5);
  }, [appointments]);

  const formatTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDateTime = (value: string) => {
    const d = new Date(value);
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isInitialLoad) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={3} />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <SkeletonCard className="lg:col-span-4 min-h-[360px]" lines={6} />
          <SkeletonCard className="lg:col-span-3 min-h-[360px]" lines={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" id="tour-dentist-stats">
        {/* Stats Card 1 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Patients</h3>
          </div>
          <div className="text-2xl font-bold">{formatNumber(stats.totalPatients)}</div>
          <p className="text-xs text-green-600 mt-1">Patients on file</p>
        </div>

        {/* Stats Card 2 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Appointments</h3>
          </div>
          <div className="text-2xl font-bold">{formatNumber(stats.todayAppointments)}</div>
          <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
        </div>

        {/* Stats Card 3 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Waiting Room</h3>
          </div>
          <div className="text-2xl font-bold">{formatNumber(stats.waiting)}</div>
          <p className="text-xs text-orange-600 mt-1">Checked-in, awaiting chair</p>
        </div>

        {/* Stats Card 4 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">In Chair</h3>
          </div>
          <div className="text-2xl font-bold">{formatNumber(stats.inTreatment)}</div>
          <p className="text-xs text-blue-600 mt-1">Actively being treated</p>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Schedule */}
        <div className="rounded-xl border bg-card shadow-sm" id="tour-dentist-schedule">
          <div className="p-6 border-b">
             <div className="flex items-center justify-between">
               <h3 className="font-semibold text-foreground">Today&apos;s Schedule</h3>
             </div>
          </div>
          <div className="p-6">
            {isInitialLoad ? (
              <p className="text-sm text-muted-foreground text-center py-10">Loading schedule…</p>
            ) : todaysAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No appointments scheduled for the rest of the day.</p>
            ) : (
              <div className="space-y-4">
                {todaysAppointments.map((appt) => {
                  const patient = typeof appt.patient === "object" ? appt.patient : undefined;
                  const dentist = typeof appt.dentist === "object" ? appt.dentist : undefined;
                  const patientName = patient ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || patient.patientCode || "Patient" : "Patient";
                  const statusColor: Record<Appointment["status"], string> = {
                    scheduled: "bg-blue-100 text-blue-800",
                    "checked-in": "bg-teal-100 text-teal-800",
                    "in-treatment": "bg-amber-100 text-amber-800",
                    completed: "bg-emerald-100 text-emerald-800",
                    cancelled: "bg-slate-100 text-slate-700",
                    "no-show": "bg-purple-100 text-purple-800",
                  };

                  return (
                    <div key={appt._id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{appt.title}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(appt.start)} – {formatTime(appt.end)}</p>
                        <p className="text-xs text-muted-foreground">Patient: {patientName}</p>
                        {dentist?.name && <p className="text-xs text-muted-foreground">Assigned to: {dentist.name}</p>}
                        {typeof appt.treatment === "object" && appt.treatment?.name && (
                          <p className="text-xs text-muted-foreground">Treatment: {appt.treatment.name}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColor[appt.status]}`}>
                        {appt.status.replace("-", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity / Notifications */}
        <div className="rounded-xl border bg-card shadow-sm" id="tour-dentist-activity">
          <div className="p-6 border-b">
             <h3 className="font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="p-4 sm:p-6">
             {isInitialLoad ? (
               <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
             ) : recentActivity.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
             ) : (
               <ul className="space-y-4">
                 {recentActivity.map((appt) => {
                   const patient = typeof appt.patient === "object" ? appt.patient : undefined;
                   const dentist = typeof appt.dentist === "object" ? appt.dentist : undefined;
                   const patientName = patient ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || patient.patientCode || "Patient" : "Patient";
                   const statusColor: Record<Appointment["status"], string> = {
                     scheduled: "bg-blue-100 text-blue-800",
                     "checked-in": "bg-teal-100 text-teal-800",
                     "in-treatment": "bg-amber-100 text-amber-800",
                     completed: "bg-emerald-100 text-emerald-800",
                     cancelled: "bg-slate-100 text-slate-700",
                     "no-show": "bg-purple-100 text-purple-800",
                   };
                   return (
                     <li key={appt._id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card/50">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{appt.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(appt.start)}</p>
                          <p className="text-xs text-muted-foreground">Patient: {patientName}</p>
                          {dentist?.name && <p className="text-xs text-muted-foreground">Assigned to: {dentist.name}</p>}
                          {typeof appt.treatment === "object" && appt.treatment?.name && (
                            <p className="text-xs text-muted-foreground">Treatment: {appt.treatment.name}</p>
                          )}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize self-start md:self-auto whitespace-nowrap ${statusColor[appt.status]}`}>
                          {appt.status.replace("-", " ")}
                        </span>
                     </li>
                   );
                 })}
               </ul>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
