"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PatientSearch from "@/components/features/patients/patient-search";
import Link from "next/link";
import SkeletonCard from "@/components/shared/skeleton-card";
import { toast } from "sonner";

type Patient = {
  _id: string;
  patientCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dentist?: { _id: string; name?: string; email?: string } | string;
};

export default function DentistPatientsPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query")?.toLowerCase() ?? "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/patients", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        if (active) setPatients(data.data ?? []);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load patients");
        toast.error("Could not load data. Please refresh the page.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query) return patients;
    return patients.filter((p) => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      return name.includes(query) || p._id.toLowerCase().includes(query) || (p.patientCode?.toLowerCase().includes(query) ?? false);
    });
  }, [patients, query]);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonCard key={index} lines={4} />
            ))}
          </div>
          <SkeletonCard className="min-h-[220px]" lines={5} />
        </div>
      ) : (
        <>

          <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm" id="tour-patients-search">
            <div className="w-full md:w-1/2">
              <PatientSearch placeholder="Search by name or ID..." />
            </div>
            <div className="text-sm text-muted-foreground">
              {`Showing ${filtered.length} result${filtered.length === 1 ? "" : "s"}`}
            </div>
          </div>

          {/* Mobile / tablet: stacked card list */}
          <div className="space-y-3 lg:hidden">
            {error && (
              <div className="bg-card rounded-lg border shadow-sm p-4 text-sm text-red-600">{error}</div>
            )}
            {!error && filtered.length === 0 && (
              <div className="bg-card rounded-lg border shadow-sm p-6 text-center text-sm text-muted-foreground">
                {query ? `No patients found for "${query}"` : "No patients found."}
              </div>
            )}
            {!error && filtered.map((patient) => {
              const dentistLabel = typeof patient.dentist === "string"
                ? patient.dentist || "—"
                : patient.dentist?.name || patient.dentist?._id || "—";
              return (
                <Link
                  key={patient._id}
                  href={`/dentist/patients/${patient._id}`}
                  className="block bg-card rounded-lg border shadow-sm p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-base font-semibold text-foreground truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.patientCode || patient._id}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">View →</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16 shrink-0">Email</dt>
                      <dd className="text-foreground truncate">{patient.email || "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16 shrink-0">Phone</dt>
                      <dd className="text-foreground truncate">{patient.phone || "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-16 shrink-0">Dentist</dt>
                      <dd className="text-foreground truncate">{dentistLabel}</dd>
                    </div>
                  </dl>
                </Link>
              );
            })}
          </div>

          {/* Desktop: standard table */}
          <div className="hidden lg:block bg-card rounded-lg border shadow-sm overflow-hidden" id="tour-patients-list">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dentist</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {error && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-red-600">{error}</td>
                  </tr>
                )}
                {!error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      {query ? `No patients found for "${query}"` : "No patients found."}
                    </td>
                  </tr>
                )}
                {!error && filtered.map((patient) => (
                  <tr key={patient._id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{patient.patientCode || patient._id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-semibold">{patient.firstName} {patient.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {patient.email || "No email"}<br />
                      {patient.phone || "No phone"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {typeof patient.dentist === "string"
                        ? patient.dentist || "—"
                        : patient.dentist?.name || patient.dentist?._id || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/dentist/patients/${patient._id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}