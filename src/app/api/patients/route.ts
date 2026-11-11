import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Patient from "@/models/Patient";
import User from "@/models/User";

// GET /api/patients - list patients
export async function GET() {
  try {
    await dbConnect();
    const patients = await Patient.find({})
      .populate({ path: "dentist", select: "name email" })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: patients });
  } catch (error: any) {
    console.error("GET /patients error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/patients - create a patient
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.dentist) {
      const dentist = await User.findOne({ role: "dentist" }).select("_id").lean();
      if (!dentist) {
        return NextResponse.json(
          { success: false, error: "No dentist user found to associate this patient with." },
          { status: 400 },
        );
      }
      body.dentist = dentist._id;
    }

    const patient = await Patient.create(body);
    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (error: any) {
    console.error("POST /patients error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
