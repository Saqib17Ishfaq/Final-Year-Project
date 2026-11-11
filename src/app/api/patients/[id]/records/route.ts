import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import dbConnect from "@/lib/db"
import PatientRecord from "@/models/PatientRecord"
import Patient from "@/models/Patient"

const RECORD_TYPES = ["X-Ray", "Past Report", "Prescription", "Lab Result", "Clinical Note"] as const

type RecordType = (typeof RECORD_TYPES)[number]

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientIdParam } = await params
  if (!patientIdParam) return badRequest("Invalid patient id")

  const url = new URL(req.url)
  const recordType = url.searchParams.get("recordType") as RecordType | null

  await dbConnect()

  const patientDoc = Types.ObjectId.isValid(patientIdParam)
    ? await Patient.findById(patientIdParam).lean()
    : await Patient.findOne({ patientCode: patientIdParam }).lean()

  if (!patientDoc?._id) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  }

  const filter: Record<string, unknown> = { patient: patientDoc._id }
  if (recordType && RECORD_TYPES.includes(recordType)) {
    filter.recordType = recordType
  }

  const records = await PatientRecord.find(filter).sort({ date: -1, createdAt: -1 }).lean()
  return NextResponse.json({ data: records })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientIdParam } = await params
  if (!patientIdParam) return badRequest("Invalid patient id")

  const body = await req.json().catch(() => null)
  if (!body) return badRequest("Invalid JSON body")

  const { recordType, title, description, fileUrl, date, uploadedBy } = body as {
    recordType?: RecordType
    title?: string
    description?: string
    fileUrl?: string
    date?: string
    uploadedBy?: "Patient" | "Doctor"
  }

  if (!recordType || !RECORD_TYPES.includes(recordType)) {
    return badRequest("recordType is required and must be valid")
  }

  if (recordType === "Clinical Note" && !description) {
    return badRequest("description is required for clinical notes")
  }

  if (recordType !== "Clinical Note" && !fileUrl) {
    return badRequest("fileUrl is required for non-note records")
  }

  await dbConnect()

  const patientDoc = Types.ObjectId.isValid(patientIdParam)
    ? await Patient.findById(patientIdParam).lean()
    : await Patient.findOne({ patientCode: patientIdParam }).lean()

  if (!patientDoc?._id) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  }

  const payload: any = {
    patient: patientDoc._id,
    recordType,
    title: title || (recordType === "Clinical Note" ? "Clinical Note" : undefined),
    description,
    fileUrl,
    uploadedBy: uploadedBy || "Doctor",
  }

  if (date) {
    const parsedDate = new Date(date)
    if (!Number.isNaN(parsedDate.getTime())) {
      payload.date = parsedDate
    }
  }

  const record = await PatientRecord.create(payload)
  return NextResponse.json({ data: record }, { status: 201 })
}
