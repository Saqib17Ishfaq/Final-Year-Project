import { NextResponse } from "next/server"
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "")
const BACKEND_REPORT_URL = process.env.BACKEND_REPORT_URL?.trim() || (BACKEND_BASE_URL ? `${BACKEND_BASE_URL}/generate-report` : undefined)

function sanitizeReportOutput(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null

  const cleaned = String(raw)
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, "")
    .trim()

  return cleaned || null
}

function fillTemplateLocally(template: string, context: Record<string, string | undefined>) {
  let output = template
  for (const [key, value] of Object.entries(context)) {
    output = output.replace(new RegExp(`{{${key}}}`, "g"), value || "")
  }
  return output
}

async function generateViaBackend(context: Record<string, any>, detections: any[] | undefined, measurements: any[] | undefined) {
  if (!BACKEND_REPORT_URL) return null

  const payload = {
    patient_name: context.patientName || "Patient",
    patient_age: context.patientAge || "N/A",
    patient_gender: context.patientGender || "N/A",
    patient_code: context.patientCode || "N/A",
    dentist_name: context.dentistName || "Dentist",
    appointment_id: context.appointmentId || "N/A",
    clinical_data: {
      chief_complaint: context.chiefComplaint,
      manual_diagnoses: context.diagnosis ? [context.diagnosis] : undefined,
      procedures_done: context.procedures ? [context.procedures] : undefined,
      prescription: context.prescription,
      follow_up: context.followUp,
      clinical_notes: context.notes,
      measurements: measurements || [],
    },
    detections: detections || [],
  }

  try {
    const controller = new AbortController()
    const backendTimeoutMs = Number(process.env.BACKEND_REPORT_TIMEOUT_MS || 0)
    const timeout = backendTimeoutMs > 0 ? setTimeout(() => controller.abort(), backendTimeoutMs) : null
    const resp = await fetch(BACKEND_REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (timeout) clearTimeout(timeout)

    if (resp.ok) {
      const json = await resp.json().catch(() => null)
      const report = sanitizeReportOutput(json?.report || json?.data?.report)
      if (report) return report
    }
  } catch (err) {
    console.warn("Backend report generation failed", err)
  }
  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.context) {
      return NextResponse.json({ success: false, error: "context is required" }, { status: 400 })
    }

    const context: Record<string, string | undefined> = body.context || {}
    const detections: any[] | undefined = body.detections
    const measurements: any[] | undefined = body.measurements
    const template: string = body.template || ""

    if (!BACKEND_REPORT_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "HF backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_REPORT_URL.",
        },
        { status: 500 }
      )
    }

    // Try backend (FastAPI) generator first
    const backendReport = await generateViaBackend(context, detections, measurements)
    if (backendReport) {
      return NextResponse.json({ success: true, report: backendReport })
    }

    // Fallback to simple template replace
    const finalReport = template ? fillTemplateLocally(template, context) : ""
    return NextResponse.json({ success: true, report: finalReport })
  } catch (error: any) {
    console.error("POST /api/treatment-report error", error)
    return NextResponse.json({ success: false, error: error?.message || "Unexpected error" }, { status: 500 })
  }
}
