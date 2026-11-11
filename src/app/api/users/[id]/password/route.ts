import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body || !body.oldPassword || !body.newPassword) {
      return NextResponse.json({ success: false, error: "Old and new password are required" }, { status: 400 });
    }

    const user = await User.findById(id).select("+password");
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Verify old password
    if (user.password) {
      const isMatch = await bcrypt.compare(body.oldPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: "Incorrect old password" }, { status: 401 });
      }
    }

    // Validate new password (at least 8 chars, uppercase, lowercase, number, special char)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPasswordRegex.test(body.newPassword)) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" }, { status: 400 });
    }

    // Hash the new password (handled by User model pre-save hook, so we just set it)
    user.password = body.newPassword;
    await user.save();

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("PUT /users/:id/password error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
