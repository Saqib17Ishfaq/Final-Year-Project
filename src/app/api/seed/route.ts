import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Patient from "@/models/Patient";
import Counter from "@/models/Counter";
import Appointment from "@/models/Appointment";
import ClinicSettings from "@/models/ClinicSettings";
import PatientRecord from "@/models/PatientRecord";
import bcrypt from "bcryptjs";
import { clinicConfig } from "../../../../config/clinic.config";

// Minimal seed endpoint to create demo data for local dev
export async function POST() {
  try {
    await dbConnect();

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Upsert a dentist user
    const dentist = await User.findOneAndUpdate(
      { email: "dentist@example.com" },
      {
        name: "Dr. Ayesha Khan",
        role: "dentist",
        password: hashedPassword,
        settings: { theme: "light", notifications: true },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Seed admin and staff users for testing auth
    await User.findOneAndUpdate(
      { email: "admin@example.com" },
      { name: "Admin Ahmed", role: "admin", password: hashedPassword, active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await User.findOneAndUpdate(
      { email: "staff@example.com" },
      { name: "Reception Farah", role: "staff", password: hashedPassword, active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Upsert clinic settings for this dentist
    await ClinicSettings.findOneAndUpdate(
      { dentist: dentist._id },
      {
        dentist: dentist._id,
        branding: {
          name: clinicConfig.name,
          description: clinicConfig.description,
          colors: {
            primary: clinicConfig.colors.primary,
            secondary: clinicConfig.colors.foreground,
            accent: clinicConfig.colors.accentTint,
          },
        },
        contact: {
          address: clinicConfig.contact.address,
          email: clinicConfig.contact.email,
          phone: clinicConfig.contact.phone,
          website: clinicConfig.contact.website,
        },
        timezone: "GMT+05:00",
        features: {
          enablePatientPortal: true,
          enableAiAnalysis: true,
          enableOnlineBooking: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Seed patients
    // Reserve a range of patient codes for seed inserts
    const seedCount = 3;
    const counterDoc = await Counter.findByIdAndUpdate(
      "patient",
      { $inc: { seq: seedCount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const startSeq = (counterDoc?.seq || seedCount) - seedCount + 1;

    const patients = await Patient.insertMany(
      [
        {
          patientCode: `PAT-${String(startSeq + 0).padStart(5, "0")}`,
          firstName: "Amina",
          lastName: "Siddiqui",
          email: "amina.siddiqui@example.com",
          phone: "+92 300 000 0001",
          dateOfBirth: new Date("1990-04-12"),
          gender: "female",
          address: "101 Main St, Lahore",
          medicalHistory: ["allergy: penicillin"],
          notes: "Prefers morning appointments",
          dentist: dentist._id,
        },
        {
          patientCode: `PAT-${String(startSeq + 1).padStart(5, "0")}`,
          firstName: "Bilal",
          lastName: "Hussain",
          email: "bilal.hussain@example.com",
          phone: "+92 300 000 0002",
          dateOfBirth: new Date("1985-09-08"),
          gender: "male",
          address: "202 Canal Bank, Karachi",
          medicalHistory: ["hypertension"],
          notes: "Follow-up in 6 months",
          dentist: dentist._id,
        },
        {
          patientCode: `PAT-${String(startSeq + 2).padStart(5, "0")}`,
          firstName: "Zara",
          lastName: "Qureshi",
          email: "zara.qureshi@example.com",
          phone: "+92 300 000 0003",
          dateOfBirth: new Date("1992-11-23"),
          gender: "female",
          address: "303 Ferozepur Rd, Islamabad",
          medicalHistory: ["none"],
          notes: "New patient",
          dentist: dentist._id,
        },
      ],
      { ordered: false }
    ).catch((err: any) => {
      // If duplicates due to rerun, ignore bulk write errors and continue
      if (err?.writeErrors) {
        return Patient.find({ dentist: dentist._id }).limit(3).lean();
      }
      throw err;
    });

    // Use the first patient for related data
    const samplePatientId = (patients[0] as any)?._id || (await Patient.findOne({ dentist: dentist._id }).lean())?._id;

    // Seed patient records (x-ray/demo)
    if (samplePatientId) {
      await PatientRecord.insertMany(
        [
          {
            patient: samplePatientId,
            recordType: "X-Ray",
            title: "OPG Scan",
            fileUrl: "/uploads/eb95b433-f717-47ec-8d80-744302263778.png",
            description: "Panoramic view",
            uploadedBy: "Doctor",
          },
          {
            patient: samplePatientId,
            recordType: "Past Report",
            title: "Treatment Plan",
            fileUrl: "/uploads/sample-report.pdf",
            description: "Initial treatment plan",
            uploadedBy: "Doctor",
          },
          {
            patient: samplePatientId,
            recordType: "Clinical Note",
            title: "Seeded Note",
            description: "Initial consultation note",
            uploadedBy: "Doctor",
          },
        ],
        { ordered: false }
      ).catch((err: any) => {
        if (!err?.writeErrors) throw err;
      });
    }

    // Seed appointments
    const now = new Date();
    const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 60 * 60 * 1000);
    const apptPayload = [
      {
        title: "Consultation - Alice",
        start: addHours(now, 24),
        end: addHours(now, 25),
        patient: patients[0]?._id || samplePatientId,
        dentist: dentist._id,
        status: "scheduled",
        type: "checkup",
        notes: "Review OPG",
      },
      {
        title: "Cleaning - Bob",
        start: addHours(now, 48),
        end: addHours(now, 49),
        patient: patients[1]?._id || samplePatientId,
        dentist: dentist._id,
        status: "scheduled",
        type: "cleaning",
        notes: "Remind about flossing",
      },
      {
        title: "Follow-up - Carol",
        start: addHours(now, 72),
        end: addHours(now, 73),
        patient: patients[2]?._id || samplePatientId,
        dentist: dentist._id,
        status: "scheduled",
        type: "x-ray",
        notes: "Capture new bitewing",
      },
    ];

    await Appointment.insertMany(apptPayload, { ordered: false }).catch((err: any) => {
      if (!err?.writeErrors) throw err;
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/seed error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    // In dev with hot reload, leave connection open (handled by mongoose cache)
    if (mongoose.connection.readyState === 0) {
      await mongoose.disconnect();
    }
  }
}
