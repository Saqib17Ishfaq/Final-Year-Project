"use client"

import { TreatmentForm } from "@/components/admin/treatments/treatment-form"
import { TreatmentsList } from "@/components/admin/treatments/treatments-list"
import { useEffect, useMemo, useState } from "react"
import { Play } from "lucide-react"
import { replayTour } from "@/components/features/onboarding/onboarding-tour"
import { TOUR_STORAGE_KEY } from "@/lib/onboarding-tour"
import { getStoredUser, StoredUser } from "@/lib/user-storage"
import { toast } from "sonner"

type TzOption = { value: string; label: string }

type TreatmentFormValue = {
  _id?: string
  name: string
  code: string
  description: string
  price: string
  currency: string
  durationMinutes: string
  type: "consultation" | "procedure" | "followup"
  active: boolean
}

type TreatmentListItem = {
  _id: string
  name: string
  code?: string
  description?: string
  price: number
  currency: string
  durationMinutes?: number
  type?: string
  active: boolean
}

const GMT_OPTIONS: TzOption[] = [
  { value: "GMT-12:00", label: "GMT-12:00 — Baker Island" },
  { value: "GMT-11:00", label: "GMT-11:00 — Samoa" },
  { value: "GMT-10:00", label: "GMT-10:00 — Honolulu" },
  { value: "GMT-09:00", label: "GMT-09:00 — Anchorage" },
  { value: "GMT-08:00", label: "GMT-08:00 — Los Angeles" },
  { value: "GMT-07:00", label: "GMT-07:00 — Denver" },
  { value: "GMT-06:00", label: "GMT-06:00 — Chicago" },
  { value: "GMT-05:00", label: "GMT-05:00 — New York" },
  { value: "GMT-04:00", label: "GMT-04:00 — Santiago" },
  { value: "GMT-03:00", label: "GMT-03:00 — Buenos Aires" },
  { value: "GMT-02:00", label: "GMT-02:00 — South Georgia" },
  { value: "GMT-01:00", label: "GMT-01:00 — Azores" },
  { value: "GMT+00:00", label: "GMT+00:00 — London" },
  { value: "GMT+01:00", label: "GMT+01:00 — Paris" },
  { value: "GMT+02:00", label: "GMT+02:00 — Cairo" },
  { value: "GMT+03:00", label: "GMT+03:00 — Moscow" },
  { value: "GMT+04:00", label: "GMT+04:00 — Dubai" },
  { value: "GMT+05:00", label: "GMT+05:00 — Karachi" },
  { value: "GMT+05:30", label: "GMT+05:30 — India Standard Time" },
  { value: "GMT+06:00", label: "GMT+06:00 — Dhaka" },
  { value: "GMT+07:00", label: "GMT+07:00 — Bangkok" },
  { value: "GMT+08:00", label: "GMT+08:00 — Singapore" },
  { value: "GMT+09:00", label: "GMT+09:00 — Tokyo" },
  { value: "GMT+10:00", label: "GMT+10:00 — Sydney" },
  { value: "GMT+11:00", label: "GMT+11:00 — Solomon Islands" },
  { value: "GMT+12:00", label: "GMT+12:00 — Auckland" },
  { value: "GMT+13:00", label: "GMT+13:00 — Tonga" },
  { value: "GMT+14:00", label: "GMT+14:00 — Kiritimati" },
]

export default function AdminSettingsPage() {
  const [timezone, setTimezone] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentFormValue | null>(null)
  const [currentUser] = useState<StoredUser>(() => getStoredUser())

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!strongPasswordRegex.test(newPassword)) {
      toast.error("Password must be at least 8 characters and include uppercase, lowercase, number, and special character")
      return
    }
    
    if (!currentUser?.id) {
      toast.error("User not found")
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch(`/api/users/${currentUser.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to change password")
      }
      
      toast.success("Password changed successfully")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setPasswordSaving(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/clinic-settings", { cache: "no-store" })
        const body = await res.json().catch(() => ({}))
        if (res.ok && body?.data?.timezone) {
          setTimezone(body.data.timezone)
        }
      } catch (err) {
        console.error("Failed to load clinic settings", err)
      }
    })()
  }, [])

  const saveTimezone = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/clinic-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      })
      if (!res.ok) throw new Error("Failed to save timezone")
      setMessage("Timezone updated")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save timezone")
    } finally {
      setSaving(false)
    }
  }

  const sortedZones = useMemo(() => {
    const base = GMT_OPTIONS
    const hasCustom = timezone && !base.find((opt) => opt.value === timezone)
    const custom = hasCustom ? [{ value: timezone, label: timezone }] : []
    return [...custom, ...base]
  }, [timezone])

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Clinic Timezone</h2>
            <p className="text-sm text-muted-foreground">Used for reports and scheduling when a fixed zone is needed.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Select timezone</label>
            <select
              className="w-full rounded border p-2"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {sortedZones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Current browser time is {new Date().toLocaleString()}.</p>
          </div>
          <div className="flex justify-end">
            <button
              disabled={saving || !timezone}
              onClick={saveTimezone}
              className="px-4 py-2 text-sm rounded bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save timezone"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Pricing &amp; Services</h2>
              <p className="text-sm text-muted-foreground">Manage treatment pricing and edit existing services from the database.</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <TreatmentForm
              treatment={selectedTreatment}
              onSaved={() => setSelectedTreatment(null)}
              onAddNew={() => setSelectedTreatment(null)}
            />
            <TreatmentsList
              onEdit={(treatment: TreatmentListItem) => setSelectedTreatment({
                _id: treatment._id,
                name: treatment.name,
                code: treatment.code || "",
                description: treatment.description || "",
                price: String(treatment.price),
                currency: treatment.currency || "PKR",
                durationMinutes: treatment.durationMinutes ? String(treatment.durationMinutes) : "",
                type: (treatment.type as TreatmentFormValue["type"]) || "consultation",
                active: treatment.active,
              })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Account Security</h2>
          <p className="text-sm text-muted-foreground">Change your admin account password.</p>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md pt-3">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Old Password</label>
            <input 
              type="password" 
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              title="At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            type="submit" 
            disabled={passwordSaving}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {passwordSaving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Guided Tour</h2>
          <p className="text-sm text-muted-foreground">Re-run the onboarding walkthrough to familiarize yourself with the admin dashboard.</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem(`${TOUR_STORAGE_KEY}_admin`)
            replayTour('admin')
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:opacity-90 transition-opacity"
        >
          <Play className="w-4 h-4" />
          Replay Onboarding Tour
        </button>
      </div>
    </div>
  )
}
