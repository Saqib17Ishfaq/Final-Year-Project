import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Appointment from "@/models/Appointment";
import Treatment from "@/models/Treatment";

const allowedTransitions: Record<string, string[]> = {
  scheduled: ["scheduled", "checked-in", "in-treatment", "completed", "cancelled", "no-show"],
  "checked-in": ["checked-in", "in-treatment", "completed", "cancelled", "no-show"],
  "in-treatment": ["in-treatment", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
  "no-show": ["no-show"],
};

// GET /api/appointments/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    const appt = await Appointment.findById(id)
      .populate([
        { path: "patient", select: "firstName lastName patientCode gender dateOfBirth" },
        { path: "dentist", select: "name email" },
        { path: "treatment", select: "name price currency" },
      ])
      .lean();
    if (!appt) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: appt });
  } catch (error: any) {
    console.error("GET /appointments/:id error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/appointments/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const existing = await Appointment.findById(id);
    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Status transition guard
    const nextStatus: string | undefined = body.status ?? existing.status;
    const allowedNext = allowedTransitions[existing.status] || [];
    if (nextStatus && !allowedNext.includes(nextStatus)) {
      return NextResponse.json({ success: false, error: `Invalid status transition from ${existing.status} to ${nextStatus}` }, { status: 400 });
    }

    // Derive timestamps on lifecycle changes
    if (nextStatus === "checked-in" && !existing.checkedInAt) existing.checkedInAt = new Date();
    if (nextStatus === "in-treatment" && !existing.seatedAt) existing.seatedAt = new Date();
    if (nextStatus === "completed" && !existing.completedAt) existing.completedAt = new Date();

    // Allow treatment change with fee defaulting
    if (body.treatmentId) {
      const treatment = await Treatment.findById(body.treatmentId).lean();
      existing.treatment = treatment?._id;
      if (body.fee === undefined && treatment?.price !== undefined) existing.fee = treatment.price;
      if (body.currency === undefined && treatment?.currency) existing.currency = treatment.currency;
    }

    if (body.fee !== undefined) existing.fee = body.fee;
    if (body.currency) existing.currency = body.currency;
    if (body.title) existing.title = body.title;
    if (body.type) existing.type = body.type;
    if (body.notes !== undefined) existing.notes = body.notes;
    if (body.start) existing.start = new Date(body.start);
    if (body.end) existing.end = new Date(body.end);
    if (body.patient) existing.patient = body.patient;
    if (body.dentist) existing.dentist = body.dentist;
    if (nextStatus) existing.status = nextStatus as any;

    const saved = await existing.save();
    const populated = await saved.populate([
      { path: "patient", select: "firstName lastName patientCode gender dateOfBirth" },
      { path: "dentist", select: "name email" },
      { path: "treatment", select: "name price currency" },
    ]);
    return NextResponse.json({ success: true, data: populated.toObject() });
  } catch (error: any) {
    console.error("PUT /appointments/:id error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/appointments/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }
    const deleted = await Appointment.findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /appointments/:id error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
