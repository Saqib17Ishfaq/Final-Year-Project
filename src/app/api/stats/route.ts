import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";

export async function GET() {
  try {
    await dbConnect();

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const [totalPatients, totalAppointments, completedWithFees, todayAppointments, waiting, inTreatment] = await Promise.all([
      Patient.countDocuments(),
      Appointment.countDocuments(),
      Appointment.aggregate([
        { $match: { status: "completed", fee: { $gt: 0 } } },
        { $group: { _id: "$currency", total: { $sum: "$fee" } } },
      ]),
      Appointment.countDocuments({
        start: { $gte: startOfDay },
        end: { $lte: endOfDay },
        status: { $nin: ["completed", "cancelled", "no-show"] },
      }),
      Appointment.countDocuments({ status: "checked-in" }),
      Appointment.countDocuments({ status: "in-treatment" }),
    ]);

    const revenue = completedWithFees.reduce<Record<string, number>>((acc, curr) => {
      acc[curr._id || "PKR"] = curr.total;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        totalPatients,
        totalAppointments,
        revenue,
        todayAppointments,
        waiting,
        inTreatment,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("GET /api/stats error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
