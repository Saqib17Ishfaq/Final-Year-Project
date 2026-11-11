import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import dbConnect from "@/lib/db"
import Appointment from "@/models/Appointment"
import TreatmentSession from "@/models/TreatmentSession"

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 })
}

async function resolveAppointment(id?: string) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null
  await dbConnect()
  const appt = await Appointment.findById(id).lean()
  return appt || null
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const appointmentId = url.searchParams.get("appointmentId")
  const patientId = url.searchParams.get("patientId")

  if (!appointmentId && !patientId) return badRequest("appointmentId or patientId is required")

  try {
    await dbConnect()

    // If patientId is provided, return all sessions for that patient
    if (patientId) {
      if (!mongoose.Types.ObjectId.isValid(patientId)) return badRequest("Invalid patientId")
      const sessions = await TreatmentSession.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .populate("appointment", "title start end status type")
        .lean()
      return NextResponse.json({ success: true, data: sessions })
    }

    // Original appointmentId flow
    const appt = await resolveAppointment(appointmentId!)
    if (!appt) return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 })

    const session = await TreatmentSession.findOne({ appointment: appt._id }).lean()
    return NextResponse.json({ success: true, data: session || null })
  } catch (error: any) {
    console.error("GET /api/treatment-sessions error", error)
    return NextResponse.json({ success: false, error: error?.message || "Unexpected error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.appointmentId) return badRequest("appointmentId is required")

    const appt = await resolveAppointment(body.appointmentId)
    if (!appt) return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 })

    const payload: Record<string, unknown> = {
      appointment: appt._id,
      patient: appt.patient,
      dentist: appt.dentist,
    }

    const fields = [
      "imageType",
      "chiefComplaint",
      "diagnosis",
      "procedures",
      "notes",
      "prescription",
      "followUp",
      "imageUrl",
      "detections",
      "reportMarkdown",
    ] as const

    for (const key of fields) {
      if (body[key] !== undefined) {
        payload[key] = body[key]
      }
    }

    if (Array.isArray(payload.detections)) {
      const normalize = (label?: unknown) => (typeof label === "string" ? label.trim().toLowerCase() : undefined)

      payload.detections = (payload.detections as any[]).map((det) => ({
        label: det?.label,
        labelNormalized: normalize(det?.label),
        confidence: typeof det?.confidence === "number" ? det.confidence : undefined,
        x: typeof det?.x === "number" ? det.x : undefined,
        y: typeof det?.y === "number" ? det.y : undefined,
        width: typeof det?.width === "number" ? det.width : undefined,
        height: typeof det?.height === "number" ? det.height : undefined,
        color: typeof det?.color === "string" ? det.color : undefined,
        mask: Array.isArray(det?.mask) ? det.mask : undefined,
      }))
    }

    await dbConnect()

    const session = await TreatmentSession.findOneAndUpdate(
      { appointment: appt._id },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()

    return NextResponse.json({ success: true, data: session })
  } catch (error: any) {
    console.error("POST /api/treatment-sessions error", error)
    return NextResponse.json({ success: false, error: error?.message || "Unexpected error" }, { status: 500 })
  }
}
