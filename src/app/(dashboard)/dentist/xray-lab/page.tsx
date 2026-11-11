'use client'

import { toast } from 'sonner'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import DropzoneUploader from '@/components/features/xray/dropzone-uploader'
import BoundingBoxCanvas from '@/components/features/xray/bounding-box-canvas'
import { TREATMENT_REPORT_TEMPLATE } from '@/templates/treatment-report-template'
import { BOXED_REPORT_TEMPLATE_HTML } from '@/templates/boxed-report-template'
import { colorizeIssues } from '@/lib/xray-colors'
import { getRulebookEntries } from '@/lib/xray-rulebook'
import { clinicConfig } from '../../../../../config/clinic.config'
import { Dialog } from '@/components/ui/dialog'

type PatientInfo = {
  firstName?: string
  lastName?: string
  patientCode?: string
  gender?: string
  dateOfBirth?: string
}

type DentistInfo = {
  name?: string
}

type Measurement = {
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  lengthMm: number
}

// Shape type - reserved for future annotation features
type _Shape =
  | { id: string; type: 'rect'; start: { x: number; y: number }; end: { x: number; y: number }; color: string }
  | { id: string; type: 'circle'; start: { x: number; y: number }; end: { x: number; y: number }; color: string }
  | { id: string; type: 'pencil'; points: { x: number; y: number }[]; color: string }

export default function PatientTreatmentPage() {
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get('appointmentId') || ''

  const [patient, setPatient] = useState<PatientInfo>({})
  const [dentist, setDentist] = useState<DentistInfo>({})
  const [notes, setNotes] = useState('')
  const [prescription, setPrescription] = useState('')
  const [procedures, setProcedures] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [issues, setIssues] = useState<any[]>([])
  const [boxedImageUrl, setBoxedImageUrl] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [appointmentStatus, setAppointmentStatus] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [showSimilarModal, setShowSimilarModal] = useState(false)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [similarError, setSimilarError] = useState<string | null>(null)
  const [similarCases, setSimilarCases] = useState<any[]>([])
  const [similarXrayCase, setSimilarXrayCase] = useState<any | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [mmPerPixel, setMmPerPixel] = useState(0.1)
  const [annotationTool, setAnnotationTool] = useState<'none' | 'measure' | 'draw-box'>('none')
  const [userBoxes, setUserBoxes] = useState<any[]>([])
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null)
  const [editingBoxLabel, setEditingBoxLabel] = useState('')
  const [showBoxes, setShowBoxes] = useState(true)
  const [showMasks, setShowMasks] = useState(true)
  // Pre-built HTML for the report modal iframe
  const [reportHtml, setReportHtml] = useState('')
  // Appointment switcher
  const [apptList, setApptList] = useState<{ _id: string; title: string; start: string; patient: any; status: string }[]>([])
  const [showApptSwitcher, setShowApptSwitcher] = useState(false)
  const apptSwitcherRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const loadAppointment = async () => {
      if (!appointmentId) return
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || body.success === false) throw new Error(body.error || 'Failed to load appointment')
        const appt = body.data || {}
        if (appt.patient) {
          if (typeof appt.patient === 'object') {
            setPatient({
              firstName: appt.patient.firstName,
              lastName: appt.patient.lastName,
              patientCode: appt.patient.patientCode,
              gender: appt.patient.gender,
              dateOfBirth: appt.patient.dateOfBirth,
            })
          } else {
            setPatient({ patientCode: appt.patient })
          }
        }
        if (appt.dentist) {
          if (typeof appt.dentist === 'object') {
            setDentist({ name: appt.dentist.name })
          } else {
            setDentist({ name: appt.dentist })
          }
        }
        if (appt.status) {
          setAppointmentStatus(appt.status)
        }
      } catch (err) {
        console.error('Failed to load appointment', err)
      }
    }
    loadAppointment()
  }, [appointmentId])

  useEffect(() => {
    const loadSession = async () => {
      if (!appointmentId) return
      setLoadingSession(true)
      try {
        const res = await fetch(`/api/treatment-sessions?appointmentId=${appointmentId}`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || body.success === false) throw new Error(body.error || 'Failed to load treatment session')
        const session = body.data || {}
        if (session.chiefComplaint) setChiefComplaint(session.chiefComplaint)
        if (session.diagnosis) setDiagnosis(session.diagnosis)
        if (session.procedures) setProcedures(session.procedures)
        if (session.notes) setNotes(session.notes)
        if (session.prescription) setPrescription(session.prescription)
        if (session.followUp) setFollowUp(session.followUp)
        if (session.imageUrl) setImageUrl(session.imageUrl)
        if (session.imageType) setImageType(session.imageType)
        if (session.detections) setIssues(colorizeIssues(session.detections))
        if (session.reportMarkdown) setReport(sanitizeReportText(session.reportMarkdown))
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingSession(false)
      }
    }
    loadSession()
  }, [appointmentId])

  // Fetch today's appointments for the switcher
  useEffect(() => {
    const loadAppts = async () => {
      try {
        const res = await fetch('/api/appointments', { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || body.success === false) return
        const today = new Date().toDateString()
        const todays = (body.data || []).filter((a: any) => new Date(a.start).toDateString() === today)
        setApptList(todays)
      } catch { /* silent */ }
    }
    loadAppts()
  }, [])

  // Close switcher on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (apptSwitcherRef.current && !apptSwitcherRef.current.contains(e.target as Node)) {
        setShowApptSwitcher(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const patientName = useMemo(() => {
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient'
  }, [patient])

  const physicalWidthMm = useMemo(() => {
    if (imageType === 'OPG') return 300 // approximate pano cassette width
    if (imageType === 'Periapical') return 40.5 // Size 2 long edge
    if (imageType === 'Bitewing') return 40.5 // Size 2 long edge
    return 40.5 // fallback to size 2
  }, [imageType])

  const recomputeLengths = (scale: number, list: Measurement[]) =>
    list.map((m) => {
      const dx = m.end.x - m.start.x
      const dy = m.end.y - m.start.y
      const distPx = Math.sqrt(dx * dx + dy * dy)
      return { ...m, lengthMm: distPx * scale }
    })

  const sanitizeReportText = (raw: string) =>
    (raw || '')
      .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '')
      .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, '')
      .trim()

  const normalizeLabel = (label?: string) => label?.trim().toLowerCase() || ''

  const availableLabels = useMemo(() => {
    const seen = new Set<string>()
    const labels: string[] = []
    issues.forEach((issue) => {
      const key = normalizeLabel(issue.label)
      if (key && !seen.has(key)) {
        seen.add(key)
        labels.push(issue.label)
      }
    })
    return labels
  }, [issues])

  const visibleIssues = useMemo(() => {
    const allIssues = [...issues, ...userBoxes]
    if (!selectedLabels.length) return allIssues
    return allIssues.filter((issue) => selectedLabels.includes(normalizeLabel(issue.label)))
  }, [issues, userBoxes, selectedLabels])

  const renderImageUrl = useMemo(() => {
    if (!imageUrl) return null
    // Route image requests through same-origin API so canvas export is not tainted.
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
  }, [imageUrl])

  const absoluteRenderImageUrl = useMemo(() => {
    if (!imageUrl || typeof window === 'undefined') return null
    return `${window.location.origin}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
  }, [imageUrl])

  const rulebookEntries = useMemo(() => {
    const labels = visibleIssues.map((i) => i.label).filter(Boolean) as string[]
    return getRulebookEntries(labels)
  }, [visibleIssues])

  const fetchSimilarCases = async (labels: string[]) => {
    if (!labels.length) {
      setSimilarCases([])
      return
    }
    setSimilarLoading(true)
    setSimilarError(null)
    try {
      const res = await fetch('/api/treatment-sessions/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels, imageType }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error || 'Failed to fetch similar cases')
      setSimilarCases(body.data || [])
    } catch (err: any) {
      console.error(err)
      setSimilarError(err?.message || 'Could not load similar cases')
      setSimilarCases([])
    } finally {
      setSimilarLoading(false)
    }
  }

  useEffect(() => {
    if (!showSimilarModal) return
    const labels = (visibleIssues.map((i) => normalizeLabel(i.label)).filter(Boolean) as string[])
    fetchSimilarCases(Array.from(new Set(labels)))
  }, [showSimilarModal, visibleIssues])

  const handleUploadComplete = (data: any) => {
    setImageUrl(data?.imageUrl || null)
    if (data?.type) setImageType(data.type)
    if (data?.issues) {
      setIssues(colorizeIssues(data.issues))
      setSelectedLabels([])
    }
    setMeasurements([])
    if (data?.imageWidthPx && physicalWidthMm) {
      const scale = physicalWidthMm / data.imageWidthPx
      setMmPerPixel(scale)
    }
  }

  const resetImaging = () => {
    setImageUrl(null)
    setImageType(null)
    setIssues([])
    setSelectedLabels([])
    setMeasurements([])
    setBoxedImageUrl(null)
    setMmPerPixel(0.1)
  }

  const handleBoxDrawn = (shape: any) => {
    if (!shape || shape.type !== 'rect') return
    const newBox = {
      id: shape.id,
      label: 'New Finding',
      confidence: 1.0,
      x: Math.min(shape.start.x, shape.end.x),
      y: Math.min(shape.start.y, shape.end.y),
      width: Math.abs(shape.end.x - shape.start.x),
      height: Math.abs(shape.end.y - shape.start.y),
      color: shape.color,
      isUserDrawn: true,
    }
    setUserBoxes((prev) => [...prev, newBox])
    setAnnotationTool('none')
  }

  const deleteBox = (boxId: string) => {
    setUserBoxes((prev) => prev.filter((b) => b.id !== boxId))
    setIssues((prev) => prev.filter((i) => i.id !== boxId))
  }

  const startEditingBox = (boxId: string, label: string) => {
    setEditingBoxId(boxId)
    setEditingBoxLabel(label)
  }

  const saveBoxLabel = (boxId: string) => {
    if (!editingBoxLabel.trim()) return
    setUserBoxes((prev) =>
      prev.map((b) => (b.id === boxId ? { ...b, label: editingBoxLabel } : b))
    )
    setIssues((prev) =>
      prev.map((i) => (i.id === boxId ? { ...i, label: editingBoxLabel } : i))
    )
    setEditingBoxId(null)
    setEditingBoxLabel('')
  }

  const updateBoxColor = (boxId: string, newColor: string) => {
    setUserBoxes((prev) =>
      prev.map((b) => (b.id === boxId ? { ...b, color: newColor } : b))
    )
    setIssues((prev) =>
      prev.map((i) => (i.id === boxId ? { ...i, color: newColor } : i))
    )
  }

  const createAnnotatedImage = async (): Promise<string | null> => {
    if (!renderImageUrl) return null

    const img = new Image()
    img.src = renderImageUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })

    const canvas = document.createElement('canvas')
    const scale = 1
    canvas.width = img.naturalWidth * scale
    canvas.height = img.naturalHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Calculate font scale based on image width - target ~11px at 600px display width
    const displayScale = Math.max(img.naturalWidth / 600, 1)
    const fontSize = Math.round(11 * displayScale)
    const lineWidth = Math.max(2, Math.round(2 * displayScale))
    const labelHeight = Math.round(16 * displayScale)
    const margin = Math.round(3 * displayScale)
    const labelPadding = Math.round(4 * displayScale)

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    visibleIssues.forEach((issue) => {
      const x = issue.x * scale
      const y = issue.y * scale
      const w = issue.width * scale
      const h = issue.height * scale
      ctx.strokeStyle = issue.color
      ctx.lineWidth = lineWidth
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = issue.color
      ctx.font = `bold ${fontSize}px sans-serif`
      const text = `${issue.label}`
      const metrics = ctx.measureText(text)
      const labelWidth = metrics.width + labelPadding * 2
      const preferredTop = y - labelHeight - margin
      let labelTop = preferredTop >= 0 ? preferredTop : y + h + margin
      if (labelTop + labelHeight > canvas.height) {
        labelTop = Math.max(margin, canvas.height - labelHeight - margin)
      }
      ctx.fillRect(x, labelTop, labelWidth, labelHeight)
      ctx.fillStyle = '#fff'
      ctx.fillText(text, x + labelPadding, labelTop + labelHeight - labelPadding)
    })

    return canvas.toDataURL('image/png')
  }

  useEffect(() => {
    // Small delay to let BoundingBoxCanvas finish rendering masks
    const timer = setTimeout(() => {
      const liveCanvas = document.querySelector('canvas') as HTMLCanvasElement | null
      if (liveCanvas) {
        try {
          const url = (liveCanvas as any).__exportAsImage?.() || liveCanvas.toDataURL('image/png')
          if (url) { setBoxedImageUrl(url); return }
        } catch { /* fall through */ }
      }
      // Fallback: bounding-box-only render
      createAnnotatedImage()
        .then((url) => setBoxedImageUrl(url))
        .catch(() => setBoxedImageUrl(null))
    }, 300)
    return () => clearTimeout(timer)
  }, [renderImageUrl, visibleIssues])

  /**
   * Capture the current canvas image as a data URL.
   * Tries live BoundingBoxCanvas first, then falls back to drawing bounding
   * boxes on the raw image, then proxied fetch as a last resort.
   * Always resolves (returns null on total failure).
   */
  const captureImageDataUrl = async (): Promise<string | null> => {
    // 1. Live canvas (includes masks)
    const liveCanvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (liveCanvas) {
      try {
        const url = (liveCanvas as any).__exportAsImage?.() || liveCanvas.toDataURL('image/png')
        if (url) return url
      } catch { /* fall through */ }
    }
    // 2. Bounding-box-only annotated image
    if (renderImageUrl && visibleIssues.length > 0) {
      try {
        const url = await createAnnotatedImage()
        if (url) return url
      } catch { /* fall through */ }
    }
    // 3. Fetch raw image as data URL (so iframe srcDoc can embed it)
    if (renderImageUrl) {
      try {
        const res = await fetch(renderImageUrl)
        if (res.ok) {
          const blob = await res.blob()
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        }
      } catch { /* fall through */ }
    }
    return null
  }

  const calcAgeYears = (dob?: string) => {
    if (!dob) return null
    const date = new Date(dob)
    if (Number.isNaN(date.getTime())) return null
    const years = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    return years >= 0 && years < 150 ? years : null
  }

  const formatGender = (gender?: string) => {
    if (!gender) return 'N/A'
    return gender.charAt(0).toUpperCase() + gender.slice(1)
  }

  const buildContext = (includeImageSection = true) => {
    const chosenImage = boxedImageUrl || absoluteRenderImageUrl
    const imageSection = includeImageSection && chosenImage ? `![X-ray Image](${chosenImage})` : 'No imaging provided.'
    const ageYears = calcAgeYears(patient.dateOfBirth)
    // Build a label-only detections section (no confidence scores)
    const detectionsSection = visibleIssues.length > 0
      ? visibleIssues.map((i) => `- ${i.label}`).join('\n')
      : 'No AI detections available.'
    return {
      patientName,
      patientCode: patient.patientCode || 'N/A',
      patientAge: ageYears !== null ? `${ageYears}` : 'N/A',
      patientGender: formatGender(patient.gender),
      appointmentId: appointmentId || 'N/A',
      dentistName: dentist.name || 'Dentist',
      date: new Date().toLocaleDateString(),
      chiefComplaint: chiefComplaint || 'Not recorded',
      diagnosis: diagnosis || 'Pending',
      procedures: procedures || 'Not recorded',
      notes: notes || 'No notes',
      prescription: prescription || 'None',
      imageSection,
      detectionsSection,
      followUp: followUp || 'As needed',
    }
  }

  const doGenerate = async () => {
    try {
      // Strip confidence scores from detections so the LLM report
      // stays clinical and doesn't reference model confidence values.
      const detectionsForReport = visibleIssues.map(({ confidence, ...rest }) => rest)
      const res = await fetch('/api/treatment-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: TREATMENT_REPORT_TEMPLATE,
          context: buildContext(false),
          detections: detectionsForReport,
          measurements: measurements,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error || 'Generation failed')
      if (body.report) {
        const sanitized = sanitizeReportText(String(body.report))
        setReport(sanitized)
        return sanitized
      }
      return ''
    } catch (err) {
      console.error(err)
      // Fallback: local fill
      const context = buildContext(true)
      let filled = TREATMENT_REPORT_TEMPLATE
      Object.entries(context).forEach(([key, value]) => {
        filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value)
      })
      const sanitized = sanitizeReportText(filled)
      setReport(sanitized)
      toast.error('Used template fallback due to generation error.')
      return sanitized
    }
    // NOTE: setGenerating is intentionally NOT called here.
    // The caller (generateReport / regenerateReport) owns the flag and sets
    // it to false only after reportHtml is ready, preventing a flash where
    // the modal renders the iframe before the HTML is built.
  }

  const autoSaveTreatment = async (reportText: string) => {
    if (!appointmentId) return
    try {
      const payload = {
        appointmentId,
        chiefComplaint,
        diagnosis,
        procedures,
        notes,
        prescription,
        followUp,
        imageUrl,
        imageType,
        detections: issues,
        reportMarkdown: reportText,
      }
      const res = await fetch('/api/treatment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error || 'Failed to save')
      toast.success('Treatment saved.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to auto-save treatment.')
    }
  }

  const generateReport = async () => {
    // Always capture a fresh data URL before opening the modal so the
    // iframe srcDoc has an embeddable image (proxied URLs are blocked inside
    // srcDoc iframes by the browser's CSP / same-origin restrictions).
    const freshDataUrl = await captureImageDataUrl()
    if (freshDataUrl) setBoxedImageUrl(freshDataUrl)

    // If a report already exists (loaded from DB), just show it immediately
    if (report) {
      setReportHtml(buildBoxedHtml(freshDataUrl))
      setShowReportModal(true)
      return
    }

    // First-time generation: open modal right away showing a loading screen.
    // Enforce a minimum wait so the LLM result AND captured image are both
    // ready before we flip generating→false and reveal the iframe.
    setGenerating(true)
    setShowReportModal(true)
    try {
      const [generatedReport] = await Promise.all([
        doGenerate(),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ])
      if (generatedReport) {
        await autoSaveTreatment(generatedReport)
      }
      // Re-capture in case generating took long and canvas changed
      const dataUrl = freshDataUrl || await captureImageDataUrl()
      setReportHtml(buildBoxedHtml(dataUrl, generatedReport || ''))
    } finally {
      setGenerating(false)
    }
  }

  const regenerateReport = async () => {
    setGenerating(true)
    try {
      const freshDataUrl = await captureImageDataUrl()
      if (freshDataUrl) setBoxedImageUrl(freshDataUrl)
      const [generatedReport] = await Promise.all([
        doGenerate(),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ])
      if (generatedReport) {
        await autoSaveTreatment(generatedReport)
      }
      setReportHtml(buildBoxedHtml(freshDataUrl, generatedReport || ''))
    } finally {
      setGenerating(false)
    }
  }

  const completeTreatment = async () => {
    if (!appointmentId) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error || 'Failed to complete treatment')
      setAppointmentStatus('completed')
      toast.success('Treatment marked as completed.')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to complete treatment.')
    } finally {
      setCompleting(false)
    }
  }

  const persistTreatment = async () => {
    if (!appointmentId) return
    setSaving(true)
    setStatusMessage(null)
    try {
      const payload = {
        appointmentId,
        chiefComplaint,
        diagnosis,
        procedures,
        notes,
        prescription,
        followUp,
        imageUrl,
        imageType,
        detections: issues,
        reportMarkdown: report,
      }

      const res = await fetch('/api/treatment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body.success === false) throw new Error(body.error || 'Failed to save treatment')
      setStatusMessage('Treatment saved to backend.')
    } catch (err) {
      console.error(err)
      setStatusMessage('Failed to save treatment.')
    } finally {
      setSaving(false)
    }
  }

  const downloadReport = () => {
    if (!report) return
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${patientName || 'treatment-report'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const formatReportHtml = (text: string) =>
    escapeHtml(sanitizeReportText(text || '')).replace(/\n/g, '<br>') || 'Not generated'

  const summarizeReport = (text: string) => {
    const sanitized = sanitizeReportText(text || '')
    if (!sanitized) return 'Not generated'
    const parts = sanitized
      .replace(/\s+/g, ' ')
      .split(/(?<=[\.\?\!])\s+|\n+/)
      .filter(Boolean)
    const clipped = parts.slice(0, 4).join(' ')
    return clipped || sanitized
  }

  const buildBoxedHtml = (forcedAnnotatedImage?: string | null, forcedReport?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    // Prefer boxed image with detections > original
    const effectiveAnnotatedImage = forcedAnnotatedImage ?? boxedImageUrl
    const chosenImage = effectiveAnnotatedImage || absoluteRenderImageUrl

    // Build detections HTML
    let detectionsHtml = ''
    if (visibleIssues.length > 0) {
      const items = visibleIssues.map(
        (issue) => `<li><strong>${escapeHtml(issue.label)}</strong></li>`
      )
      detectionsHtml = `<ul class="detection-list">${items.join('')}</ul>`
    } else {
      detectionsHtml = '<p class="no-data">No AI detections available.</p>'
    }

    // Build imaging note
    let imagingNote = ''
    if (effectiveAnnotatedImage && visibleIssues.length > 0) {
      imagingNote = `Image shows ${visibleIssues.length} AI-detected finding(s) with bounding boxes`
    } else if (absoluteRenderImageUrl) {
      imagingNote = 'Original X-ray image'
    }

    const ageYears = calcAgeYears(patient.dateOfBirth)
    // Use forcedReport if provided (avoids stale React state when called right
    // after setReport() which hasn't flushed yet).
    const reportText = forcedReport !== undefined ? forcedReport : report
    const ctx: Record<string, string> = {
      clinicName: clinicConfig.name,
      logoSrc: origin ? `${origin}${clinicConfig.logo.url}` : clinicConfig.logo.url,
      date: new Date().toLocaleDateString(),
      patientName,
      patientCode: patient.patientCode || 'N/A',
      patientAge: ageYears !== null ? `${ageYears}` : 'N/A',
      patientGender: formatGender(patient.gender),
      appointmentId: appointmentId || 'N/A',
      dentistName: dentist.name || 'Dentist',
      xrayType: imageType || 'Not classified',
      chiefComplaint: chiefComplaint || 'Not recorded',
      diagnosis: diagnosis || 'Pending',
      procedures: procedures || 'Not recorded',
      notes: notes || 'No notes',
      prescription: prescription || 'None',
      followUp: followUp || 'As needed',
      llmReport: formatReportHtml(reportText),
      detectionsHtml,
      imagingNote,
    }

    let html: string = BOXED_REPORT_TEMPLATE_HTML

    const imageHtml = chosenImage
      ? `<img src="${chosenImage}" alt="Annotated X-Ray" style="max-width: 100%; max-height: 200px;" />\n            <div class="imaging-note">${escapeHtml(imagingNote)}</div>`
      : ''

    html = html.replace(/\{\{#if imageUrl\}\}[\s\S]*?\{\{\/if\}\}/, chosenImage ? imageHtml : '')
    html = html.replace(/\{\{#ifNot imageUrl\}\}[\s\S]*?\{\{\/ifNot\}\}/, chosenImage ? '' : '<p class="no-data">No imaging provided.</p>')

    // Replace all placeholders; these keys already contain sanitized HTML.
    Object.entries(ctx).forEach(([key, value]) => {
      if (key === 'detectionsHtml' || key === 'llmReport') {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value)
      } else {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), escapeHtml(String(value)))
      }
    })

    return html
  }

  const downloadBoxedHtml = async () => {
    try {
      // Create a temporary container for the report
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = buildBoxedHtml()
      tempContainer.style.position = 'fixed'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = '210mm'
      tempContainer.style.backgroundColor = '#ffffff'
      document.body.appendChild(tempContainer)

      // Capture canvas from the HTML
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      document.body.removeChild(tempContainer)

      // PDF dimensions
      const PAGE_W = 210 // A4 width in mm
      const PAGE_H = 297 // A4 height in mm
      const MARGIN = 10
      const HEADER_H = 32 // Header height in mm
      const FOOTER_H = 18 // Footer height in mm
      const CONTENT_H = PAGE_H - MARGIN * 2 - HEADER_H - FOOTER_H

      // Create PDF
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Canvas dimensions
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const mmPerPx = PAGE_W / canvasWidth

      // Slice canvas into pages
      let currentY = 0
      let pageNum = 1
      const totalPages = Math.ceil(canvasHeight / (CONTENT_H / mmPerPx))

      while (currentY < canvasHeight) {
        if (pageNum > 1) pdf.addPage()

        // Draw header
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.text(clinicConfig?.name || 'Clinic', MARGIN + 40, MARGIN + 8)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        const headerAgeYears = calcAgeYears(patient.dateOfBirth)
        const headerAge = headerAgeYears !== null ? `${headerAgeYears}` : 'N/A'
        const headerGender = formatGender(patient.gender)
        pdf.text(`Patient: ${patientName}`, MARGIN, MARGIN + 14)
        pdf.text(`Code: ${patient.patientCode || 'N/A'}`, MARGIN, MARGIN + 18)
        pdf.text(`Appointment: ${appointmentId || 'N/A'}`, MARGIN + 60, MARGIN + 14)
        pdf.text(`X-Ray: ${imageType || 'N/A'}`, MARGIN + 60, MARGIN + 18)
        pdf.text(`Age: ${headerAge}  |  Gender: ${headerGender}`, MARGIN + 60, MARGIN + 22)

        if (clinicConfig?.contact?.address) {
          pdf.text(clinicConfig.contact.address, MARGIN, MARGIN + 25)
        }
        if (clinicConfig?.contact?.phone) {
          pdf.text(`Phone: ${clinicConfig.contact.phone}`, MARGIN, MARGIN + 29)
        }

        pdf.text(`Page ${pageNum}/${totalPages}`, PAGE_W - MARGIN - 20, MARGIN + 8)

        // Draw divider line
        pdf.setDrawColor(200)
        pdf.line(MARGIN, MARGIN + HEADER_H - 3, PAGE_W - MARGIN, MARGIN + HEADER_H - 3)

        // Calculate how much content fits on this page
        const contentHeight = CONTENT_H / mmPerPx
        const sliceHeight = Math.min(contentHeight, canvasHeight - currentY)

        // Create slice from canvas
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvasWidth
        sliceCanvas.height = sliceHeight
        const ctx = sliceCanvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(canvas, 0, currentY, canvasWidth, sliceHeight, 0, 0, canvasWidth, sliceHeight)
        }

        // Add to PDF
        const imgData = sliceCanvas.toDataURL('image/png')
        const imgWidth = PAGE_W - MARGIN * 2
        const imgHeight = (sliceHeight * mmPerPx)
        pdf.addImage(imgData, 'PNG', MARGIN, MARGIN + HEADER_H, imgWidth, imgHeight)

        // Draw footer
        const footerY = PAGE_H - FOOTER_H + 5
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(`Generated by ${clinicConfig?.name || 'Clinic'} • ${new Date().toLocaleDateString()}`, MARGIN, footerY)
        pdf.text('Dentist Signature: ________________________', MARGIN, footerY + 5)
        pdf.text(`Dr. ${dentist.name || 'Not Specified'}`, MARGIN, footerY + 9)

        // Draw divider line
        pdf.setDrawColor(200)
        pdf.line(MARGIN, footerY - 2, PAGE_W - MARGIN, footerY - 2)

        currentY += sliceHeight
        pageNum++
      }

      // Save PDF
      pdf.save(`TreatmentReport_${patientName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`)
    } catch (err) {
      console.error('Failed to download PDF:', err)
      alert('Failed to generate PDF. Check browser console for details.')
    }
  }

  const printBoxedHtml = async () => {
    let annotatedForPrint = boxedImageUrl

    // Try to capture the live BoundingBoxCanvas which includes segmentation masks
    if (!annotatedForPrint) {
      const liveCanvas = document.querySelector('canvas') as HTMLCanvasElement | null
      if (liveCanvas) {
        try {
          annotatedForPrint = (liveCanvas as any).__exportAsImage?.() || liveCanvas.toDataURL('image/png')
          if (annotatedForPrint) setBoxedImageUrl(annotatedForPrint)
        } catch {
          annotatedForPrint = null
        }
      }
    }

    // Fallback to bounding-box-only annotated image
    if (!annotatedForPrint && renderImageUrl && visibleIssues.length > 0) {
      try {
        annotatedForPrint = await createAnnotatedImage()
        if (annotatedForPrint) setBoxedImageUrl(annotatedForPrint)
      } catch {
        annotatedForPrint = null
      }
    }

    // Final fallback: fetch the original X-ray via the proxy and embed it as a
    // data URL. Print windows can fire `print()` before remote `<img>` requests
    // resolve, which leaves the X-ray missing in the saved PDF.
    if (!annotatedForPrint && renderImageUrl) {
      try {
        const res = await fetch(renderImageUrl)
        if (res.ok) {
          const blob = await res.blob()
          annotatedForPrint = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          if (annotatedForPrint) setBoxedImageUrl(annotatedForPrint)
        }
      } catch {
        annotatedForPrint = null
      }
    }

    const html = buildBoxedHtml(annotatedForPrint)
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    // Wait for assets (logo/image) to load before printing.
    // Register the load handler BEFORE document.write so we don't miss the event
    // (about:blank often loads instantly on open).
    let printTriggered = false
    const triggerPrint = async () => {
      if (printTriggered) return
      printTriggered = true
      const images = Array.from(printWindow.document.images)
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve()
                return
              }
              img.onload = () => resolve()
              img.onerror = () => resolve()
            })
        )
      )
      setTimeout(() => printWindow.print(), 100)
    }
    printWindow.onload = triggerPrint
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    // Safety net: if `load` already fired before we registered (race on
    // about:blank), kick off the print pipeline manually after a short delay.
    setTimeout(triggerPrint, 500)
  }

  const printReport = () => {
    if (!report) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(`<pre style="white-space: pre-wrap; font-family: monospace;">${report.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (loadingSession) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 w-64 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 bg-muted rounded-md" />
            <div className="h-9 w-36 bg-muted rounded-md" />
            <div className="h-9 w-32 bg-muted rounded-md" />
          </div>
        </div>

        {/* Two-column body skeleton */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Left: imaging area */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="h-5 w-40 bg-muted rounded mb-4" />
              <div className="h-[360px] bg-muted rounded-lg" />
            </div>
          </div>

          {/* Right: clinical fields */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
              <div className="h-5 w-32 bg-muted rounded" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="mt-2 text-sm text-foreground">
            <div>Patient: <span className="font-semibold">{patientName}</span> {patient.patientCode ? `(Code: ${patient.patientCode})` : ''}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {dentist.name && <span>Dentist: <span className="font-semibold">{dentist.name}</span></span>}
              <span>Age: <span className="font-semibold">{calcAgeYears(patient.dateOfBirth) ?? 'N/A'}</span></span>
              <span>Gender: <span className="font-semibold">{formatGender(patient.gender)}</span></span>
            </div>
            {appointmentId && <div>Appointment ID: {appointmentId} {appointmentStatus && <span className="ml-2 uppercase text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">{appointmentStatus}</span>}</div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Appointment switcher */}
          <div className="relative" ref={apptSwitcherRef}>
            <button
              onClick={() => setShowApptSwitcher((v) => !v)}
              className="px-3 py-2 text-sm font-medium border rounded-md hover:bg-muted flex items-center gap-1.5"
              title="Switch appointment"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
              </svg>
              Today's Appointments
            </button>
            {showApptSwitcher && (
              <div className="absolute right-0 mt-1 z-30 w-80 rounded-lg border bg-card shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Today — {new Date().toLocaleDateString()}
                </div>
                {apptList.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">No appointments today</div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto divide-y">
                    {apptList.map((appt) => {
                      const name = typeof appt.patient === 'object'
                        ? `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim()
                        : appt.title
                      const time = new Date(appt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      const isActive = appt._id === appointmentId
                      return (
                        <li key={appt._id}>
                          <button
                            onClick={() => {
                              setShowApptSwitcher(false)
                              router.push(`/dentist/xray-lab?appointmentId=${appt._id}`)
                            }}
                            className={`w-full text-left px-3 py-2.5 hover:bg-muted transition-colors ${
                              isActive ? 'bg-primary/10 font-semibold' : ''
                            }`}
                          >
                            <div className="text-sm text-foreground">{name || appt.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{time}</span>
                              <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted">{
                                appt.status
                              }</span>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
          {appointmentId && appointmentStatus !== 'completed' && appointmentStatus !== 'cancelled' && (
            <button
              onClick={completeTreatment}
              disabled={completing}
              className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-md hover:bg-emerald-200 disabled:opacity-60"
            >
              {completing ? 'Completing…' : 'Complete Treatment'}
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-md hover:opacity-90 disabled:opacity-60"
            id="tour-xray-report"
          >
            {generating ? 'Generating…' : report ? 'View Report' : 'Generate Report'}
          </button>
          <button
            onClick={persistTreatment}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save treatment'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 shadow-sm" id="tour-xray-canvas">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Imaging &amp; AI View</h3>
              <div className="flex items-center gap-2 text-xs text-foreground flex-wrap justify-end">
                {imageUrl && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                    Imaging attached
                  </span>
                )}
                {imageUrl && imageType && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-800">
                    {imageType}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {imageUrl && (
                    <>
                      <button
                        onClick={() => setAnnotationTool((prev) => (prev === 'measure' ? 'none' : 'measure'))}
                        className={`min-h-[44px] min-w-[44px] touch-manipulation px-3 py-1 rounded border text-[11px] font-semibold transition-colors ${
                          annotationTool === 'measure'
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-card text-foreground border-gray-300 hover:bg-muted'
                        }`}
                      >
                        {annotationTool === 'measure' ? 'Exit Measure' : 'Measure'}
                      </button>
                      <button
                        onClick={() => setAnnotationTool((prev) => (prev === 'draw-box' ? 'none' : 'draw-box'))}
                        className={`min-h-[44px] min-w-[44px] touch-manipulation px-3 py-1 rounded border text-[11px] font-semibold transition-colors ${
                          annotationTool === 'draw-box'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-card text-foreground border-gray-300 hover:bg-muted'
                        }`}
                      >
                        {annotationTool === 'draw-box' ? 'Exit Draw' : 'Draw Box'}
                      </button>
                    </>
                  )}
                  {measurements.length > 0 && (
                    <button
                      onClick={() => {
                        setMeasurements([])
                        setAnnotationTool('none')
                      }}
                      className="min-h-[44px] min-w-[44px] touch-manipulation px-2 py-1 rounded border border-gray-300 text-[11px] font-semibold hover:bg-muted"
                    >
                      Clear marks
                    </button>
                  )}
                  {userBoxes.length > 0 && (
                    <button
                      onClick={() => {
                        setUserBoxes([])
                        setAnnotationTool('none')
                      }}
                      className="min-h-[44px] min-w-[44px] touch-manipulation px-2 py-1 rounded border border-gray-300 text-[11px] font-semibold hover:bg-muted"
                    >
                      Clear boxes
                    </button>
                  )}
                  {imageUrl && (
                    <button
                      onClick={resetImaging}
                      className="min-h-[44px] min-w-[44px] touch-manipulation px-3 py-1 rounded border text-[11px] font-semibold transition-colors bg-card text-foreground border-gray-300 hover:bg-muted"
                    >
                      Replace image
                    </button>
                  )}
                </div>
              </div>
            </div>
            {annotationTool === 'measure' && (
              <p className="text-xs text-blue-600 mt-1">
                Click and drag on the image to measure distances. Click &quot;Exit Measure&quot; when done.
              </p>
            )}
            {annotationTool === 'draw-box' && (
              <p className="text-xs text-amber-600 mt-1">
                Click and drag on the image to draw new detection boxes. Enter label and click save. Click &quot;Exit Draw&quot; when done.
              </p>
            )}
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Tooth numbers follow FDI notation. First digit = quadrant (1–4), second digit = position (1–8).
            </div>
            {measurements.length > 0 && (
              <div className="mt-2 text-xs text-foreground">
                <span className="font-medium">Measurements: </span>
                {measurements.map((m, i) => (
                  <span key={m.id}>
                    {m.lengthMm.toFixed(2)} mm{i < measurements.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
            {visibleIssues.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold text-foreground">Detections ({visibleIssues.length}):</div>
                <div className="flex flex-wrap gap-2">
                  {visibleIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center gap-2 px-2 py-1 rounded border border-gray-200 bg-gray-50">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: issue.color || '#ef4444' }}
                      />
                      {editingBoxId === issue.id ? (
                        <>
                          <input
                            type="text"
                            value={editingBoxLabel}
                            onChange={(e) => setEditingBoxLabel(e.target.value)}
                            className="w-36 px-2 py-1 text-xs border rounded"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveBoxLabel(issue.id)
                              if (e.key === 'Escape') setEditingBoxId(null)
                            }}
                          />
                          <button
                            onClick={() => saveBoxLabel(issue.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingBoxId(null)}
                            className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            className="text-xs font-medium text-foreground cursor-pointer hover:underline"
                            onClick={() => startEditingBox(issue.id, issue.label)}
                          >
                            {issue.label}
                          </span>
                          {typeof issue.confidence === 'number' && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded-full">
                              {Math.round(issue.confidence * 100)}%
                            </span>
                          )}
                          {issue.isUserDrawn && (
                            <>
                              <input
                                type="color"
                                value={issue.color || '#ef4444'}
                                onChange={(e) => updateBoxColor(issue.id, e.target.value)}
                                className="w-6 h-6 cursor-pointer rounded border"
                                title="Change box color"
                              />
                              <button
                                onClick={() => deleteBox(issue.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete box"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!imageUrl && (
              <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-4">
                <DropzoneUploader onUploadComplete={handleUploadComplete} />
              </div>
            )}
            {issues.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Layers:</span>
                <label
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    showBoxes ? 'bg-blue-50 border-blue-300 text-blue-800' : 'border-gray-300 text-foreground hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showBoxes}
                    onChange={(e) => setShowBoxes(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Bounding boxes</span>
                </label>
                <label
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    showMasks ? 'bg-purple-50 border-purple-300 text-purple-800' : 'border-gray-300 text-foreground hover:bg-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={showMasks}
                    onChange={(e) => setShowMasks(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Segmentation masks</span>
                </label>
                <span className="mx-1 text-gray-300">|</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Filter by class:</span>
                {availableLabels.map((label) => {
                  const key = label?.toLowerCase?.().trim?.() || ''
                  const active = selectedLabels.includes(key)
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                        active ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'border-gray-300 text-foreground hover:bg-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() =>
                          setSelectedLabels((prev) =>
                            prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
                {availableLabels.length === 0 && (
                  <span className="text-xs text-muted-foreground">Detections did not include class labels.</span>
                )}
                {selectedLabels.length > 0 && (
                  <button
                    onClick={() => setSelectedLabels([])}
                    className="text-xs text-blue-700 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {imageUrl ? (
              <BoundingBoxCanvas
                imageUrl={renderImageUrl || imageUrl || ''}
                issues={visibleIssues}
                measurements={measurements}
                onMeasurementsChange={setMeasurements}
                physicalWidthMm={physicalWidthMm}
                annotationTool={annotationTool}
                imageType={imageType}
                showBoxes={showBoxes}
                showMasks={showMasks}
                onScaleComputed={(scale) => {
                  setMmPerPixel(scale)
                  setMeasurements((prev) => recomputeLengths(scale, prev))
                }}
                onShapesChange={(newShapes) => {
                  const resolvedShapes =
                    typeof newShapes === 'function' ? newShapes([]) : newShapes
                  const lastShape = resolvedShapes[resolvedShapes.length - 1]
                  if (lastShape) handleBoxDrawn(lastShape)
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Upload an X-ray to view detections.</p>
            )}
            {imageUrl && visibleIssues.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {issues.length === 0
                  ? 'Detections will appear here once the specific model is available.'
                  : 'No detections for the selected classes.'}
              </p>
            )}
            {visibleIssues.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-xs text-foreground">
                <div>
                  Showing {visibleIssues.length} detections across {availableLabels.length} classes.
                </div>
                <button
                  onClick={() => setShowSimilarModal(true)}
                  className="text-blue-700 font-semibold hover:underline"
                >
                  View similar cases
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground">Chief complaint</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Diagnosis</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={3}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Procedures</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={3}
                value={procedures}
                onChange={(e) => setProcedures(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Notes</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Prescription</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={3}
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Follow-up</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Clinical Guide</h3>
            <p className="text-xs text-muted-foreground mb-3">Contextual suggestions for the detections currently visible.</p>
            {rulebookEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Select detections to view guidance.</p>
            ) : (
              <div className="space-y-3">
                {rulebookEntries.map((entry) => (
                  <div key={entry.label} className="border rounded-md p-3 bg-gray-50">
                    <div className="font-semibold text-foreground mb-1">{entry.label}</div>
                    <p className="text-sm text-foreground mb-2">{entry.summary}</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                      {entry.actions.map((act, idx) => (
                        <li key={idx}>{act}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* ── Report Modal ─────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg bg-card text-card-foreground shadow-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">AI Treatment Report</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-full p-1 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-20 gap-5">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-muted" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[var(--primary)] animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-base font-semibold text-foreground">Generating AI Report</p>
                    <p className="text-sm text-muted-foreground">Analyzing findings and composing clinical notes…</p>
                  </div>
                </div>
              ) : (
                <iframe
                  srcDoc={reportHtml || buildBoxedHtml()}
                  className="w-full h-full min-h-[60vh] rounded border-0"
                  title="AI Treatment Report"
                />
              )}
            </div>
            <div className="border-t border-border px-6 py-4 flex items-center justify-between">
              <button
                onClick={regenerateReport}
                disabled={generating}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted disabled:opacity-60"
              >
                {generating ? 'Regenerating…' : 'Regenerate Report'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={printBoxedHtml}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-md hover:opacity-90"
                >
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog isOpen={showSimilarModal} onClose={() => setShowSimilarModal(false)} title="Similar cases (auto)">
        {similarLoading && <p className="text-sm text-muted-foreground">Loading similar cases…</p>}
        {!similarLoading && similarError && (
          <p className="text-sm text-red-600">{similarError}</p>
        )}
        {!similarLoading && !similarError && similarCases.length === 0 && (
          <p className="text-sm text-muted-foreground">No similar cases found for the current detections.</p>
        )}
        {!similarLoading && !similarError && similarCases.length > 0 && (
          <div className="space-y-4 text-sm text-foreground max-h-[70vh] overflow-auto">
            {similarCases.map((c, idx) => {
              const matched = Array.isArray(c.matchedLabels) ? c.matchedLabels.join(', ') : ''
              const reportPreview = typeof c.reportMarkdown === 'string' ? summarizeReport(c.reportMarkdown) : ''

              return (
                <div key={c._id || c.id || idx} className="border rounded-md p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground">{c.diagnosis || 'Similar case'}</div>
                      {matched && <div className="text-xs text-muted-foreground">Matched labels: {matched}</div>}
                    </div>
                    <div className="text-right space-y-1">
                      {c.imageType && (
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-foreground bg-gray-200 px-2 py-1 rounded">
                          {c.imageType}
                        </span>
                      )}
                      {c.updatedAt && (
                        <div className="text-[10px] text-muted-foreground">Updated {new Date(c.updatedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  {c.summary && <p className="text-foreground mb-2">{c.summary}</p>}
                  {c.procedures && (
                    <div className="text-foreground mb-1"><span className="font-medium">Procedures:</span> {c.procedures}</div>
                  )}
                  {c.notes && <div className="text-foreground mb-1"><span className="font-medium">Notes:</span> {c.notes}</div>}
                  {c.prescription && (
                    <div className="text-foreground mb-1"><span className="font-medium">Rx:</span> {c.prescription}</div>
                  )}
                  {reportPreview && (
                    <div className="text-foreground text-xs bg-card border rounded p-2">Report preview: {reportPreview}</div>
                  )}
                  {c.imageUrl && (
                    <button
                      onClick={() => setSimilarXrayCase(c)}
                      className="mt-2 px-3 py-1.5 text-xs font-medium text-[var(--primary)] border border-[var(--primary)] rounded-md hover:bg-[var(--primary)] hover:text-white transition-colors"
                    >
                      Show X-Ray
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Dialog>

      {/* ── Similar Case X-Ray Viewer ──────────────────────────── */}
      {similarXrayCase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg bg-card text-card-foreground shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Similar Case X-Ray</h2>
                <p className="text-xs text-muted-foreground">
                  {similarXrayCase.diagnosis || 'Similar case'}
                  {similarXrayCase.imageType && ` — ${similarXrayCase.imageType}`}
                </p>
              </div>
              <button
                onClick={() => setSimilarXrayCase(null)}
                className="rounded-full p-1 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <BoundingBoxCanvas
                imageUrl={`/api/image-proxy?url=${encodeURIComponent(similarXrayCase.imageUrl)}`}
                issues={colorizeIssues(similarXrayCase.detections || []) as any}
                measurements={[]}
                onMeasurementsChange={() => {}}
                physicalWidthMm={similarXrayCase.imageType === 'OPG' ? 300 : 40.5}
                annotationTool="none"
                imageType={similarXrayCase.imageType}
                showBoxes={true}
                showMasks={true}
                onScaleComputed={() => {}}
                onShapesChange={() => {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
