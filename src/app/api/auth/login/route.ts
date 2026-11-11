import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as LoginBody | null;
    if (!body?.email || !body?.password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: { $regex: new RegExp(`^${body.email}$`, "i") } }).select("+password");
    if (!user || !user.password) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    if (user.active === false) {
      return NextResponse.json({ success: false, error: "Account revoked. Contact administrator." }, { status: 403 });
    }

    const match = await bcrypt.compare(body.password, user.password);
    if (!match) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    const response = NextResponse.json({
      success: true,
      data: { id: String(user._id), name: user.name, email: user.email, role: user.role, image: user.image || null },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("POST /api/auth/login error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
