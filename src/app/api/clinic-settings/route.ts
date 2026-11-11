import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ClinicSettings from "@/models/ClinicSettings";
import User from "@/models/User";

const DEFAULT_ROLE = "dentist" as const;

type BrandingPayload = {
  name?: string;
  description?: string;
  colors?: {
    primary?: string;
    accent?: string;
  };
};

type ContactPayload = {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
};

type SettingsPayload = {
  dentistId?: string;
  branding?: BrandingPayload;
  contact?: ContactPayload;
  timezone?: string;
};

async function resolveDentistId(dentistId?: string) {
  if (dentistId) return dentistId;
  const dentist = await User.findOne({ role: DEFAULT_ROLE }).select("_id").lean();
  return dentist?._id?.toString() || null;
}

export async function GET() {
  try {
    await dbConnect();
    const dentistId = await resolveDentistId();
    if (!dentistId) {
      return NextResponse.json({ success: false, error: "No dentist user found" }, { status: 404 });
    }

    let settings = await ClinicSettings.findOne({ dentist: dentistId }).lean();
    if (!settings) {
      settings = await ClinicSettings.create({ dentist: dentistId });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("GET /api/clinic-settings error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SettingsPayload | null;

    const dentistId = await resolveDentistId(body?.dentistId);
    if (!dentistId) {
      return NextResponse.json({ success: false, error: "No dentist user found" }, { status: 404 });
    }

    const update: Record<string, string> = {};

    if (body?.branding) {
      if (typeof body.branding.name === "string") update["branding.name"] = body.branding.name;
      if (typeof body.branding.description === "string") update["branding.description"] = body.branding.description;
      if (body.branding.colors) {
        if (typeof body.branding.colors.primary === "string") update["branding.colors.primary"] = body.branding.colors.primary;
        if (typeof body.branding.colors.accent === "string") update["branding.colors.accent"] = body.branding.colors.accent;
      }
    }

    if (body?.contact) {
      if (typeof body.contact.email === "string") update["contact.email"] = body.contact.email;
      if (typeof body.contact.phone === "string") update["contact.phone"] = body.contact.phone;
      if (typeof body.contact.address === "string") update["contact.address"] = body.contact.address;
      if (typeof body.contact.website === "string") update["contact.website"] = body.contact.website;
    }

    if (body?.timezone && typeof body.timezone === "string") {
      update["timezone"] = body.timezone;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields provided" }, { status: 400 });
    }

    const settings = await ClinicSettings.findOneAndUpdate(
      { dentist: dentistId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("PUT /api/clinic-settings error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
