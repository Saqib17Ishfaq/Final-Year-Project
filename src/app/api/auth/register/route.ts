import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

const ROLES = ["admin", "dentist", "staff"] as const;
type Role = (typeof ROLES)[number];

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as RegisterBody | null;
    if (!body?.name || !body.email || !body.password) {
      return NextResponse.json({ success: false, error: "Name, email, and password are required" }, { status: 400 });
    }

    const role: Role = body.role && ROLES.includes(body.role) ? body.role : "staff";

    await dbConnect();

    const existing = await User.findOne({ email: body.email }).lean();
    if (existing) {
      return NextResponse.json({ success: false, error: "User already exists" }, { status: 409 });
    }

    const user = await User.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role,
      active: true,
    });

    return NextResponse.json({
      success: true,
      data: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("POST /api/auth/register error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
