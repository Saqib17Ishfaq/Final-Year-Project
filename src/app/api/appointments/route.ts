import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Appointment from "@/models/Appointment";
import Treatment from "@/models/Treatment";
import "@/models/User"; // Ensure User schema is registered for populate
import "@/models/Patient"; // Ensure Patient schema is registered for populate

// Sweep stale appointment statuses: anything whose end time has passed gets
// reconciled — in-treatment becomes completed, untouched scheduled/checked-in
// rows become no-show. Runs lazily on every list fetch so the next visitor
// sees an up-to-date board even if no cron job is running.
async function autoTidyAppointments() {
  const now = new Date();
  await Appointment.updateMany(
    { end: { $lt: now }, status: "in-treatment" },
    { $set: { status: "completed", completedAt: now } },
  );
  await Appointment.updateMany(
    { end: { $lt: now }, status: { $in: ["scheduled", "checked-in"] } },
    { $set: { status: "no-show" } },
  );
}

// GET /api/appointments - list
export async function GET() {
  try {
    await dbConnect();
    await autoTidyAppointments();
    const appts = await Appointment.find({})
      .populate({ path: "patient", select: "firstName lastName patientCode phone" })
      .populate({ path: "dentist", select: "name email" })
      .populate({ path: "treatment", select: "name price currency" })
      .sort({ start: 1 })
      .lean();
    return NextResponse.json({ success: true, data: appts });
  } catch (error: any) {
    console.error("GET /appointments error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/appointments - create
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const treatment = body.treatmentId
      ? await Treatment.findById(body.treatmentId).lean()
      : null;

    const appt = await Appointment.create({
      ...body,
      treatment: body.treatmentId,
      fee: body.fee ?? treatment?.price ?? 0,
      currency: body.currency || treatment?.currency || "PKR",
      status: body.status || "scheduled",
    });
    return NextResponse.json({ success: true, data: appt }, { status: 201 });
  } catch (error: any) {
    console.error("POST /appointments error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
