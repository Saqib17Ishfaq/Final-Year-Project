"use client"

import { useState } from "react"
import { toast } from "sonner"

type Gender = "male" | "female" | "other"

export default function PatientForm({ 
  onCancel, 
  initialData 
}: { 
  onCancel: () => void;
  initialData?: any;
}) {
  const [firstName, setFirstName] = useState(initialData?.firstName || "")
  const [lastName, setLastName] = useState(initialData?.lastName || "")
  const [email, setEmail] = useState(initialData?.email || "")
  const [phone, setPhone] = useState(initialData?.phone || "")
  
  // Format date for the input field (YYYY-MM-DD)
  const formattedDate = initialData?.dateOfBirth 
    ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] 
    : ""
  
  const [dateOfBirth, setDateOfBirth] = useState(formattedDate)
  const [gender, setGender] = useState<Gender | "">(initialData?.gender || "")
  const [medicalHistory, setMedicalHistory] = useState(
    initialData?.medicalHistory?.join("\n") || ""
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!firstName.trim() || !lastName.trim() || !dateOfBirth || !gender) {
      toast.error("Please fill in first name, last name, date of birth, and gender.")
      return
    }

    setSaving(true)
    try {
      const isEdit = !!initialData?._id
      const url = isEdit ? `/api/patients/${initialData._id}` : "/api/patients"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          dateOfBirth,
          gender,
          medicalHistory: medicalHistory
            .split("\n")
            .map((line: string) => line.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `Save failed (${res.status})`)
      }
      toast.success(isEdit ? "Patient updated." : "Patient created.")
      onCancel()
      // Refresh the page so the changes appear.
      if (typeof window !== "undefined") window.location.reload()
    } catch (err: any) {
      toast.error(err?.message || "Could not save patient.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">First Name</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Last Name</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="john.doe@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Date of Birth</label>
          <input
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Gender</label>
        <div className="flex flex-wrap gap-2">
          {(["male", "female", "other"] as const).map((option) => {
            const active = gender === option
            return (
              <label
                key={option}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm capitalize cursor-pointer transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={active}
                  onChange={() => setGender(option)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  required
                />
                {option}
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Medical History Notes (Optional)</label>
        <textarea
          value={medicalHistory}
          onChange={(e) => setMedicalHistory(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="One item per line — allergies, past surgeries, etc."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Patient"}
        </button>
      </div>
    </form>
  )
}
