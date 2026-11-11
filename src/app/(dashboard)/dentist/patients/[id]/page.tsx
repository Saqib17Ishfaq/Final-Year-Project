"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import BoundingBoxCanvas from "@/components/features/xray/bounding-box-canvas"
import { toast } from "sonner"

type Patient = {
  _id: string
  patientCode?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  gender?: string
  dateOfBirth?: string
  medicalHistory?: string[]
  dentist?: { _id: string; name?: string; email?: string } | string
}

type PatientRecord = {
  _id: string
  patient: string
  recordType: "X-Ray" | "Past Report" | "Prescription" | "Lab Result" | "Clinical Note"
  title?: string
  fileUrl?: string
  date?: string
  description?: string
  uploadedBy?: "Patient" | "Doctor"
  createdAt?: string
}

type TreatmentOption = { _id: string; name: string; price?: number; currency?: string }
type DentistOption = { _id: string; name?: string; email?: string }

function formatDate(date?: string) {
  if (!date) return "—"
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString()
}

function calcAge(date?: string) {
  if (!date) return "—"
  const dob = new Date(date)
  if (Number.isNaN(dob.getTime())) return "—"
  const diff = Date.now() - dob.getTime()
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  return `${years}`
}

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>()
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const id = rawId ? decodeURIComponent(rawId) : undefined

  const [patient, setPatient] = useState<Patient | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<PatientRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [appointmentNotes, setAppointmentNotes] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)
  const [showXrayModal, setShowXrayModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedXrayId, setSelectedXrayId] = useState<string | null>(null)
  const [showBoxes, setShowBoxes] = useState(true)
  const [showMasks, setShowMasks] = useState(true)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [scheduleStart, setScheduleStart] = useState("")
  const [scheduleEnd, setScheduleEnd] = useState("")
  const [scheduleTitle, setScheduleTitle] = useState("")
  const [scheduleType, setScheduleType] = useState<"checkup" | "cleaning" | "x-ray" | "surgery" | "ortho" | "other">("checkup")
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [scheduleTreatmentId, setScheduleTreatmentId] = useState("")
  const [scheduleDentistId, setScheduleDentistId] = useState("")
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [treatmentOptions, setTreatmentOptions] = useState<TreatmentOption[]>([])
  const [dentistOptions, setDentistOptions] = useState<DentistOption[]>([])
  const [uploadType, setUploadType] = useState<"X-Ray" | "Lab Result" | "Prescription" | "Past Report">("X-Ray")
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadFileUrl, setUploadFileUrl] = useState<string | undefined>(undefined)
  const [uploadSaving, setUploadSaving] = useState(false)
  const [treatmentSessions, setTreatmentSessions] = useState<any[]>([])
  const [treatmentSessionsLoading, setTreatmentSessionsLoading] = useState(false)

  const patientIdForApi = patient?._id || patient?.patientCode

  const openXrayModal = () => {
    setRecordsError(null)
    setSelectedXrayId(null)
    setShowBoxes(true)
    setShowMasks(true)
    setShowXrayModal(true)
  }

  const openNoteModal = () => {
    setRecordsError(null)
    setEditingNoteId(null)
    setNoteText("")
    setShowNoteModal(true)
  }

  const openScheduleModal = () => {
    setScheduleError(null)
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
    const toLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setScheduleStart(toLocal(now))
    setScheduleEnd(toLocal(inOneHour))
    setScheduleTitle(patient ? `${patient.firstName} ${patient.lastName} - ${scheduleType}` : "")
    setScheduleNotes("")
    setScheduleTreatmentId("")
    const dentistId = typeof patient?.dentist === "string" ? patient.dentist : patient?.dentist?._id || ""
    setScheduleDentistId(dentistId)
    setShowScheduleModal(true)
  }

  const openUploadModal = () => {
    setRecordsError(null)
    setUploadFileUrl(undefined)
    setUploadTitle("")
    setUploadType("X-Ray")
    setShowUploadModal(true)
  }

  useEffect(() => {
    if (!id) {
      setError("Missing patient id")
      setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      try {
        // First try direct fetch by id; if it fails with 400/404, fall back to list lookup
        const res = await fetch(`/api/patients/${id}`, { cache: "no-store" })
        if (active && res.ok) {
          const { data } = (await res.json()) as { data: Patient }
          setPatient(data)
          return
        }

        // If invalid id or not found, try searching the full list so we still render if present
        const list = await fetch(`/api/patients`, { cache: "no-store" })
        if (!active) return
        if (!list.ok) {
          setError(`Failed to load patient (${res.status || list.status})`)
          toast.error(`Failed to load patient (${res.status || list.status})`)
          return
        }
        const { data: all } = (await list.json()) as { data: Patient[] }
        const found = all?.find((p) => p._id === id || p.patientCode === id)
        if (found) {
          setPatient(found)
        } else {
          setError("Patient not found")
          toast.error("Patient not found")
        }
      } catch (err: any) {
        if (!active) return
        setError(err?.message || "Failed to load patient")
        toast.error(err?.message || "Failed to load patient")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!patient?._id) return
    ;(async () => {
      try {
        const res = await fetch("/api/appointments", { cache: "no-store" })
        if (!res.ok) return
        const { data } = await res.json()
        const patientAppts = (data || []).filter((a: any) => {
          const pid = typeof a.patient === "object" ? a.patient?._id : a.patient
          return pid === patient._id
        })
        const latest = patientAppts
          .filter((a: any) => a.notes)
          .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime())[0]
        if (latest?.notes) setAppointmentNotes(latest.notes)
      } catch {
        // silently ignore
      }
    })()
  }, [patient?._id])

  const dentistName = useMemo(() => {
    if (!patient?.dentist) return "Not assigned"
    if (typeof patient.dentist === "string") return patient.dentist
    return patient.dentist.name || patient.dentist._id || "Not assigned"
  }, [patient])

  const xrayRecords = useMemo(() => {
    const recordXrays = records.filter((r) => r.recordType === "X-Ray")
    const sessionXrays = treatmentSessions
      .filter((s) => s.imageUrl)
      .map((s) => ({
        _id: s._id || `session-${s.appointment}`,
        patient: s.patient,
        recordType: "X-Ray" as const,
        title: s.imageType ? `${s.imageType} X-ray` : "X-Ray",
        fileUrl: s.imageUrl,
        date: s.createdAt,
        description: s.diagnosis || s.chiefComplaint || "",
        uploadedBy: "Doctor" as const,
        createdAt: s.createdAt,
        source: "treatment" as const,
        detections: s.detections,
        appointment: s.appointment,
      }))
    return [...sessionXrays, ...recordXrays].sort((a, b) => {
      const da = new Date(a.date || a.createdAt || 0).getTime()
      const db = new Date(b.date || b.createdAt || 0).getTime()
      return db - da
    })
  }, [records, treatmentSessions])
  const clinicalNotes = useMemo(() => records.filter((r) => r.recordType === "Clinical Note"), [records])
  const historyRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const da = new Date(a.date || a.createdAt || 0).getTime()
      const db = new Date(b.date || b.createdAt || 0).getTime()
      return db - da
    })
  }, [records])

  useEffect(() => {
    if (!patientIdForApi) return
    let active = true
    setRecordsLoading(true)

    ;(async () => {
      try {
        const res = await fetch(`/api/patients/${patientIdForApi}/records`, { cache: "no-store" })
        if (!active) return
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setRecordsError(body?.error || "Failed to load records")
          toast.error(body?.error || "Failed to load records")
          return
        }
        const { data } = (await res.json()) as { data: PatientRecord[] }
        setRecords(data || [])
      } catch (err: any) {
        if (!active) return
        setRecordsError(err?.message || "Failed to load records")
        toast.error(err?.message || "Failed to load records")
      } finally {
        if (active) setRecordsLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [patientIdForApi])

  useEffect(() => {
    if (!patient?._id) return
    let active = true
    setTreatmentSessionsLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/treatment-sessions?patientId=${patient._id}`, { cache: "no-store" })
        if (!active) return
        if (!res.ok) return
        const { data } = await res.json()
        setTreatmentSessions(data || [])
      } catch {
        // silently ignore
      } finally {
        if (active) setTreatmentSessionsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [patient?._id])

  const addClinicalNote = async () => {
    if (!patientIdForApi) return
    if (!noteText.trim()) {
      setRecordsError("Note cannot be empty")
      return
    }
    setNoteSaving(true)
    setRecordsError(null)
    try {
      const url = editingNoteId
        ? `/api/patients/${patientIdForApi}/records/${editingNoteId}`
        : `/api/patients/${patientIdForApi}/records`

      const res = await fetch(url, {
        method: editingNoteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType: "Clinical Note",
          description: noteText.trim(),
          title: "Clinical Note",
          uploadedBy: "Doctor",
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || "Failed to save note")
      }

      if (editingNoteId) {
        // Update existing note
        setRecords((prev) =>
          prev.map((r) => (r._id === editingNoteId ? { ...r, description: noteText.trim(), date: new Date().toISOString() } : r))
        )
        setEditingNoteId(null)
      } else {
        // Add new note
        const newRecord = body.data as PatientRecord
        setRecords((prev) => [newRecord, ...prev])
      }

      setNoteText("")
      toast.success(editingNoteId ? "Note updated" : "Note saved")
    } catch (err: any) {
      setRecordsError(err?.message || "Failed to save note")
      toast.error(err?.message || "Failed to save note")
    } finally {
      setNoteSaving(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!patientIdForApi) return
    if (!confirm("Delete this note?")) return

    try {
      const res = await fetch(`/api/patients/${patientIdForApi}/records/${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete note")

      setRecords((prev) => prev.filter((r) => r._id !== noteId))
      toast.success("Note deleted")
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete note")
    }
  }

  const startEditNote = (note: PatientRecord) => {
    setEditingNoteId(note._id)
    setNoteText(note.description || "")
  }

  // Fetch treatments and dentists for the schedule modal
  useEffect(() => {
    ;(async () => {
      try {
        const [treatRes, usersRes] = await Promise.all([
          fetch("/api/treatments", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
        ])
        if (treatRes.ok) {
          const { data } = await treatRes.json()
          setTreatmentOptions((data || []).filter((t: any) => t?.active !== false))
        }
        if (usersRes.ok) {
          const { data } = await usersRes.json()
          setDentistOptions((data || []).filter((u: any) => u?.role === "dentist"))
        }
      } catch {
        // silently ignore — selects will just be empty
      }
    })()
  }, [])

  const createAppointment = async () => {
    if (!patient || !patientIdForApi) return
    if (!scheduleStart || !scheduleEnd) {
      setScheduleError("Start and end times are required")
      return
    }
    if (new Date(scheduleEnd) <= new Date(scheduleStart)) {
      setScheduleError("End time must be after start time")
      return
    }
    setScheduleSaving(true)
    setScheduleError(null)
    try {
      const dentistId = scheduleDentistId || (typeof patient.dentist === "string" ? patient.dentist : patient.dentist?._id)
      const payload: Record<string, unknown> = {
        title: scheduleTitle || `${patient.firstName} ${patient.lastName} - ${scheduleType}`,
        start: new Date(scheduleStart).toISOString(),
        end: new Date(scheduleEnd).toISOString(),
        patient: patient._id,
        dentist: dentistId,
        type: scheduleType,
        status: "scheduled",
        notes: scheduleNotes,
      }
      if (scheduleTreatmentId) payload.treatmentId = scheduleTreatmentId
      const res = await fetch(`/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Failed to schedule appointment")
      toast.success("Appointment scheduled successfully")
      setShowScheduleModal(false)
    } catch (err: any) {
      setScheduleError(err?.message || "Failed to schedule appointment")
      toast.error(err?.message || "Failed to schedule appointment")
    } finally {
      setScheduleSaving(false)
    }
  }

  const onUploadFile = (file?: File | null) => {
    if (!file) {
      setUploadFileUrl(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setUploadFileUrl(typeof reader.result === "string" ? reader.result : undefined)
    }
    reader.readAsDataURL(file)
  }

  const openRecordFile = async (fileUrl?: string | null) => {
    if (!fileUrl) return
    try {
      const openInTab = (url: string, revoke?: () => void) => {
        const newTab = window.open(url, "_blank", "noopener")
        if (!newTab) {
          setRecordsError("Popup blocked. Please allow popups for this site to view the file.")
          if (revoke) revoke()
          return
        }
        if (revoke) newTab.onload = revoke
      }

      if (fileUrl.startsWith("data:")) {
        const res = await fetch(fileUrl)
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        openInTab(blobUrl, () => URL.revokeObjectURL(blobUrl))
      } else {
        openInTab(fileUrl)
      }
    } catch (err) {
      console.error("Failed to open file", err)
      setRecordsError("Unable to open file. Please try downloading instead.")
      toast.error("Unable to open file. Please try downloading instead.")
    }
  }

  const uploadRecord = async () => {
    if (!patientIdForApi) return
    if (!uploadFileUrl) {
      setRecordsError("File is required")
      return
    }
    setUploadSaving(true)
    setRecordsError(null)
    try {
      const res = await fetch(`/api/patients/${patientIdForApi}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType: uploadType,
          title: uploadTitle || uploadType,
          fileUrl: uploadFileUrl,
          uploadedBy: "Doctor",
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Failed to upload record")
      const newRecord = body.data as PatientRecord
      setRecords((prev) => [newRecord, ...prev])
      setShowUploadModal(false)
      setUploadFileUrl(undefined)
      setUploadTitle("")
    } catch (err: any) {
      setRecordsError(err?.message || "Failed to upload record")
      toast.error(err?.message || "Failed to upload record")
    } finally {
      setUploadSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-6"></div>
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 h-64"></div>
            <div className="bg-card border rounded-xl p-6 h-48"></div>
          </div>
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 h-48"></div>
            <div className="bg-card border rounded-xl p-6 h-96"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-foreground">Patient Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || "The patient does not exist."}</p>
        <Link href="/dentist/patients" className="text-blue-600 hover:underline">
          ← Back to Directory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dentist/patients" className="text-sm text-muted-foreground hover:underline mb-1 block">
            &larr; Back to Directory
          </Link>
          <div className="text-xl font-semibold flex items-center gap-3">
            {patient.firstName} {patient.lastName}
            <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-800">Active</span>
          </div>
          <p className="text-muted-foreground">Code: {patient.patientCode || patient._id} - {patient.gender || "-"} - Age {calcAge(patient.dateOfBirth)}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded bg-card text-foreground hover:bg-muted">Edit Profile</button>
          <button
            onClick={openScheduleModal}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Schedule Next Appointment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-foreground mb-4 border-b pb-2">Contact Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="block text-muted-foreground">Phone</span>
                <span className="text-foreground font-medium">{patient.phone || "—"}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Email</span>
                <span className="text-foreground font-medium">{patient.email || "—"}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Address</span>
                <span className="text-foreground font-medium">{patient.address || "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-foreground mb-4 border-b pb-2">Demographics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span className="text-foreground font-medium">{patient.gender || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date of Birth</span><span className="text-foreground font-medium">{formatDate(patient.dateOfBirth)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Age</span><span className="text-foreground font-medium">{calcAge(patient.dateOfBirth)}</span></div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-foreground mb-4 border-b pb-2">Medical History</h3>
            {recordsLoading ? (
              <p className="text-sm text-muted-foreground">Loading records…</p>
            ) : historyRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patient records yet.</p>
            ) : (
              <ul className="space-y-2">
                {historyRecords.map((record) => (
                  <li key={record._id} className="border rounded p-3 bg-gray-50 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {record.recordType}
                        {record.title && record.title !== record.recordType ? ` – ${record.title}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(record.date || record.createdAt)}</span>
                    </div>
                    {record.description && <p className="text-xs text-foreground mt-1">{record.description}</p>}
                    {record.fileUrl && (
                      <button
                        type="button"
                        onClick={() => openRecordFile(record.fileUrl)}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        Open file
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <span className="text-sm text-blue-600 font-medium">Dentist</span>
              <p className="text-lg font-bold text-blue-900">{dentistName}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <span className="text-sm text-purple-600 font-medium">Patient Code</span>
              <p className="text-sm font-mono text-purple-900 break-all">{patient.patientCode || patient._id}</p>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-foreground">Treatment History</h3>
              <span className="text-xs text-muted-foreground">{treatmentSessions.length} session(s)</span>
            </div>
            {treatmentSessionsLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading treatment history…</div>
            ) : treatmentSessions.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No treatment sessions recorded yet.</div>
            ) : (
              <div className="divide-y max-h-[420px] overflow-y-auto">
                {treatmentSessions.map((session: any) => {
                  const appt = session.appointment || {}
                  const sessionDate = appt.start
                    ? new Date(appt.start).toLocaleDateString()
                    : session.createdAt
                      ? new Date(session.createdAt).toLocaleDateString()
                      : "—"
                  const apptType = appt.type || "—"
                  const apptStatus = appt.status || "—"
                  const detectionCount = Array.isArray(session.detections) ? session.detections.length : 0
                  return (
                    <div key={session._id} className="px-6 py-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{sessionDate}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{apptType}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              apptStatus === "completed" ? "bg-green-100 text-green-700"
                                : apptStatus === "in-treatment" ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>{apptStatus}</span>
                          </div>
                          {session.diagnosis && (
                            <p className="text-sm text-foreground"><span className="text-muted-foreground">Diagnosis:</span> {session.diagnosis}</p>
                          )}
                          {session.chiefComplaint && (
                            <p className="text-xs text-muted-foreground">Chief Complaint: {session.chiefComplaint}</p>
                          )}
                          {session.procedures && (
                            <p className="text-xs text-muted-foreground">Procedures: {session.procedures}</p>
                          )}
                          {detectionCount > 0 && (
                            <p className="text-xs text-purple-600">{detectionCount} AI detection(s) recorded</p>
                          )}
                        </div>
                        {session.appointment?._id && (
                          <Link
                            href={`/dentist/xray-lab?appointmentId=${session.appointment._id}`}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap mt-1"
                          >
                            View Session →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={openXrayModal}
              className="flex-1 bg-gray-800 text-white p-4 rounded-lg hover:bg-gray-900 text-center transition"
            >
              View X-Rays
            </button>
            <button
              onClick={openNoteModal}
              className="flex-1 border-2 border-dashed border-gray-300 text-muted-foreground p-4 rounded-lg hover:border-blue-400 hover:text-blue-600 transition"
            >
              + Add Clinical Note
            </button>
            <button
              onClick={openUploadModal}
              className="flex-1 border-2 border-gray-200 text-foreground p-4 rounded-lg hover:border-green-400 hover:text-green-700 transition"
            >
              + Upload Record
            </button>
          </div>
        </div>
      </div>

      <Dialog isOpen={showXrayModal} onClose={() => setShowXrayModal(false)} title={selectedXrayId ? "X-Ray Viewer" : "X-Ray Records"}>
        {selectedXrayId ? (
          // Viewer Mode
          (() => {
            const xray = xrayRecords.find((r) => r._id === selectedXrayId)
            if (!xray) return <p className="text-sm text-muted-foreground">X-ray not found</p>
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <p className="font-semibold text-foreground">{xray.title || "X-Ray"}</p>
                    <p className="text-xs text-muted-foreground">{xray.date ? formatDate(xray.date) : "Date unknown"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedXrayId(null)}
                    className="text-xs px-3 py-1 rounded border text-foreground hover:bg-muted"
                  >
                    Back
                  </button>
                </div>

                {/* Layer Toggles */}
                <div className="flex gap-2 items-center text-xs">
                  <span className="text-muted-foreground">Layers:</span>
                  <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                    showBoxes ? 'bg-blue-50 border-blue-300 text-blue-800' : 'border-gray-300 text-foreground hover:bg-gray-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={showBoxes}
                      onChange={(e) => setShowBoxes(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                    <span>Boxes</span>
                  </label>
                  <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${
                    showMasks ? 'bg-purple-50 border-purple-300 text-purple-800' : 'border-gray-300 text-foreground hover:bg-gray-100'
                  }`}>
                    <input
                      type="checkbox"
                      checked={showMasks}
                      onChange={(e) => setShowMasks(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600"
                    />
                    <span>Masks</span>
                  </label>
                </div>

                {/* Canvas Viewer */}
                {xray.fileUrl && (
                  <div className="border rounded-lg overflow-hidden bg-black">
                    <BoundingBoxCanvas
                      imageUrl={xray.fileUrl}
                      issues={(xray as any).detections || []}
                      showBoxes={showBoxes}
                      showMasks={showMasks}
                      imageType={xray.title?.split(" ")[0] || undefined}
                    />
                  </div>
                )}

                {/* Clinical Details */}
                {xray.source === "treatment" && (
                  <div className="text-xs space-y-2 pt-3 border-t">
                    {xray.description && (
                      <>
                        <p className="font-medium text-foreground">Notes</p>
                        <p className="text-muted-foreground">{xray.description}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          // List Mode
          <div className="space-y-3">
            {recordsLoading || treatmentSessionsLoading ? (
              <p className="text-sm text-muted-foreground">Loading X-rays…</p>
            ) : recordsError ? (
              <p className="text-sm text-red-600">{recordsError}</p>
            ) : xrayRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No X-rays yet.</p>
            ) : (
              xrayRecords.map((record) => (
                <button
                  key={record._id}
                  type="button"
                  onClick={() => setSelectedXrayId(record._id)}
                  className="w-full text-left flex items-center justify-between rounded border px-3 py-2 hover:bg-muted transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{record.title || "X-Ray"}</p>
                    <p className="text-xs text-muted-foreground">{record.date ? formatDate(record.date) : "Date unknown"}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {record.detections?.length || 0} finding{record.detections?.length !== 1 ? "s" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </Dialog>

      <Dialog isOpen={showNoteModal} onClose={() => { setShowNoteModal(false); setEditingNoteId(null); }} title={editingNoteId ? "Edit Clinical Note" : "Add Clinical Note"}>
        <div className="space-y-3">
          {recordsError && <p className="text-sm text-red-600">{recordsError}</p>}
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write a brief clinical note"
            rows={4}
          />
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNoteModal(false)
                  setEditingNoteId(null)
                  setNoteText("")
                }}
                className="px-4 py-2 rounded border text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={addClinicalNote}
                disabled={noteSaving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {noteSaving ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}
              </button>
            </div>
            {editingNoteId && (
              <button
                onClick={() => {
                  deleteNote(editingNoteId)
                  setEditingNoteId(null)
                  setNoteText("")
                }}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            )}
          </div>
          {clinicalNotes.length > 0 && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Previous Notes</p>
              {clinicalNotes.map((note) => (
                <div
                  key={note._id}
                  className={`border rounded p-2 transition-colors cursor-pointer ${
                    editingNoteId === note._id ? "bg-blue-50 border-blue-300" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1" onClick={() => startEditNote(note)}>
                      <p className="text-foreground">{note.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{note.date ? formatDate(note.date) : "Added"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNote(note._id)
                      }}
                      className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      <Dialog isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Schedule Next Appointment">
        <div className="space-y-4">
          {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Appointment Title</label>
            <input
              type="text"
              value={scheduleTitle}
              onChange={(e) => setScheduleTitle(e.target.value)}
              placeholder="e.g., Cleaning - Patient Name"
              className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start</label>
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End</label>
              <input
                type="datetime-local"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
                className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Treatment</label>
            <select
              value={scheduleTreatmentId}
              onChange={(e) => setScheduleTreatmentId(e.target.value)}
              className="w-full rounded border p-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {treatmentOptions.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}{typeof t.price === "number" ? ` (${t.currency || "PKR"} ${t.price})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Dentist</label>
            <select
              value={scheduleDentistId}
              onChange={(e) => setScheduleDentistId(e.target.value)}
              className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Use assigned dentist —</option>
              {dentistOptions.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name || d.email || d._id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as typeof scheduleType)}
                className="w-full rounded border p-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="checkup">Checkup</option>
                <option value="cleaning">Cleaning</option>
                <option value="x-ray">X-Ray</option>
                <option value="surgery">Surgery</option>
                <option value="ortho">Ortho</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                disabled
                value="scheduled"
                className="w-full rounded border p-2 text-sm capitalize bg-gray-50 text-muted-foreground"
              >
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              rows={3}
              className="w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Purpose, prep, or instructions"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-sm rounded border text-foreground hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={createAppointment}
              disabled={scheduleSaving}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {scheduleSaving ? "Scheduling..." : "Schedule Appointment"}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Record">
        <div className="space-y-3">
          {recordsError && <p className="text-sm text-red-600">{recordsError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as typeof uploadType)}
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="X-Ray">X-Ray</option>
                <option value="Lab Result">Lab Result</option>
                <option value="Prescription">Prescription</option>
                <option value="Past Report">Past Report</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Optional title"
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">File</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => onUploadFile(e.target.files?.[0])}
              className="w-full text-sm"
            />
            {uploadFileUrl && <p className="text-xs text-green-600 mt-1">File ready to upload</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded border text-foreground hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={uploadRecord}
              disabled={uploadSaving}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {uploadSaving ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
