'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, View, Views, SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Dialog } from '@/components/ui/dialog'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

type PatientOption = {
  _id: string
  firstName: string
  lastName: string
  dentist?: string
}

type AppointmentPayload = {
  _id?: string
  title: string
  start: string
  end: string
  status: string
  patient: string
  dentist: string
  type?: string
  notes?: string
}

export default function CalendarScheduler() {
  const [view, setView] = useState<View>(Views.WEEK)
  const [date, setDate] = useState(new Date())

  // Default to Day view on phones — Week view's 7-column grid is unreadable
  // at narrow widths. Users can still switch via the toolbar.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 640px)').matches) {
      setView(Views.DAY)
    }
  }, [])
  const [events, setEvents] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [patientsRes, apptRes] = await Promise.all([
          fetch('/api/patients', { cache: 'no-store' }),
          fetch('/api/appointments', { cache: 'no-store' }),
        ])

        if (!patientsRes.ok) throw new Error('Unable to load patients')
        if (!apptRes.ok) throw new Error('Unable to load appointments')

        const patientsJson = await patientsRes.json()
        const apptsJson = await apptRes.json()

        if (!active) return

        const patientList: PatientOption[] = patientsJson.data ?? []
        setPatients(patientList)
        setSelectedPatientId((patientList[0] && patientList[0]._id) || '')

        const mapped = (apptsJson.data ?? []).map((appt: any) => ({
          id: appt._id,
          title: appt.title,
          start: new Date(appt.start),
          end: new Date(appt.end),
          status: appt.status,
          resource: appt,
        }))
        setEvents(mapped)
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load schedule')
        toast.error(err.message || 'Failed to load schedule')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Poll appointments to reflect cross-screen updates without disrupting navigation
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const apptRes = await fetch('/api/appointments', { cache: 'no-store' })
        if (!apptRes.ok) return
        const apptsJson = await apptRes.json()
        const mapped = (apptsJson.data ?? []).map((appt: any) => ({
          id: appt._id,
          title: appt.title,
          start: new Date(appt.start),
          end: new Date(appt.end),
          status: appt.status,
          resource: appt,
        }))
        setEvents(mapped)
      } catch (err) {
        console.error('Could not refresh appointments.', err)
      }
    }, 30000)
    return () => clearInterval(id)
  }, [])

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate])
  const onView = useCallback((newView: View) => setView(newView), [setView])

  const minTime = useMemo(() => new Date(1970, 0, 1, 8, 0, 0), [])
  const maxTime = useMemo(() => new Date(1970, 0, 1, 23, 59, 59), [])

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (!patients.length) {
        setError('Add a patient before scheduling.')
        return
      }
      setError(null)
      setSelectedSlot(slotInfo)
      setNewEventTitle('')
      setStartValue(slotInfo.start.toISOString().slice(0, 16))
      setEndValue(slotInfo.end.toISOString().slice(0, 16))
      setIsModalOpen(true)
    },
    []
  )

  const openBlankModal = () => {
    if (!patients.length) {
      setError('Add a patient before scheduling.')
      return
    }
    setError(null)
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
    setSelectedSlot({ start: now, end: inOneHour, slots: [], action: 'select' })
    setStartValue(now.toISOString().slice(0, 16))
    setEndValue(inOneHour.toISOString().slice(0, 16))
    setNewEventTitle('')
    setIsModalOpen(true)
  }

  const selectedPatient = useMemo(
    () => patients.find((p) => p._id === selectedPatientId),
    [patients, selectedPatientId]
  )

  const handleSaveEvent = async () => {
    if (!startValue || !endValue || !selectedPatient) {
      setError('Patient, start, and end are required')
      return
    }

    const startD = new Date(startValue)
    const endD = new Date(endValue)
    if (startD.getHours() < 8) {
      setError('Appointments must be scheduled between 8 AM and 12 AM.')
      return
    }
    if (endD.getHours() < 8 && endD.getHours() !== 0) { // 0 is midnight
      setError('Appointments must end by 12 AM.')
      return
    }

    setSaving(true)
    setError(null)

    const finalTitle = newEventTitle.trim() || `${selectedPatient.firstName} ${selectedPatient.lastName} - Checkup`;

    const payload: AppointmentPayload = {
      title: finalTitle,
      start: new Date(startValue).toISOString(),
      end: new Date(endValue).toISOString(),
      status: 'scheduled',
      patient: selectedPatient._id,
      dentist: selectedPatient.dentist || '',
      type: 'checkup',
      notes: '',
    }

    try {
      if (!payload.dentist) throw new Error('Missing dentist for this patient')

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create appointment')
      const { data } = await res.json()

      const newEvent = {
        id: data._id,
        title: data.title,
        start: new Date(data.start),
        end: new Date(data.end),
        status: data.status,
        resource: data,
      }
      setEvents((prev) => [...prev, newEvent])
      setIsModalOpen(false)
    } catch (err: any) {
      setError(err.message || 'Could not save appointment')
      toast.error(err.message || 'Could not save appointment')
    } finally {
      setSaving(false)
    }
  }

  // Custom styling for events — same status palette used by the receptionist
  // appointments calendar so both views are visually consistent.
  const STATUS_COLORS: Record<string, string> = {
    scheduled: '#2563eb',
    'checked-in': '#059669',
    'in-treatment': '#d97706',
    completed: '#475569',
    cancelled: '#dc2626',
    'no-show': '#6b7280',
  }
  const eventPropGetter = (event: any) => {
    const status = (event.status || event.resource?.status || 'scheduled') as string
    const backgroundColor = STATUS_COLORS[status] || STATUS_COLORS.scheduled
    return {
      style: {
        backgroundColor,
        borderRadius: 6,
        border: 'none',
        color: '#fff',
        padding: '1px 4px',
        fontSize: 12,
      },
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Calendar</h3>
        <button
          onClick={openBlankModal}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90"
        >
          + New appointment
        </button>
      </div>

      <div className="h-[360px] sm:h-[520px] bg-background p-2 sm:p-4 rounded-lg shadow-sm border border-border">
        <div className="h-full">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            date={date}
            onView={onView}
            onNavigate={onNavigate}
            min={minTime}
            max={maxTime}
            eventPropGetter={eventPropGetter}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            selectable
            onSelectSlot={handleSelectSlot}
          />
        </div>
      </div>

      <Dialog 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="New Appointment"
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Appointment Title
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              placeholder="e.g., Cleaning - Patient Name"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Patient</label>
            <select
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-md hover:bg-muted"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={handleSaveEvent}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Appointment'}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
