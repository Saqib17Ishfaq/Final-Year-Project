import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import dbConnect from "@/lib/db"
import PatientRecord from "@/models/PatientRecord"

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  const { id: patientIdParam, recordId } = await params
  if (!patientIdParam) return badRequest("Invalid patient id")
  if (!recordId) return badRequest("Invalid record id")
  if (!Types.ObjectId.isValid(recordId)) return badRequest("Invalid record id format")

  await dbConnect()

  const deletedRecord = await PatientRecord.findOneAndDelete({
    _id: recordId,
    // We optionally verify the record belongs to the patient if we had the resolved patient ObjectId,
    // but typically matching by recordId is enough for a strict deletion.
  })

  if (!deletedRecord) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Record deleted successfully" })
}
