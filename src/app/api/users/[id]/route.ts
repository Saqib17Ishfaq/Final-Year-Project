import { NextResponse } from "next/server"
import { Types } from "mongoose"
import dbConnect from "@/lib/db"
import User from "@/models/User"

const ROLES = ["admin", "dentist", "staff"] as const

type Role = (typeof ROLES)[number]

function invalidId() {
  return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!Types.ObjectId.isValid(id)) return invalidId()
  try {
    await dbConnect()
    const user = await User.findById(id).lean()
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: user })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("GET /users/[id] error", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!Types.ObjectId.isValid(id)) return invalidId()

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })

    const { name, email, role, active, image } = body as {
      name?: string
      email?: string
      role?: Role
      active?: boolean
      image?: string
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (image !== undefined) updates.image = image
    if (active !== undefined) updates.active = active
    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
      }
      updates.role = role
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No updates provided" }, { status: 400 })
    }

    await dbConnect()

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: id } }).lean()
      if (existing) {
        return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 })
      }
    }

    const updated = await User.findByIdAndUpdate(id, updates, { new: true }).lean()
    if (!updated) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("PATCH /users/[id] error", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!Types.ObjectId.isValid(id)) return invalidId()
  try {
    await dbConnect()
    const deleted = await User.findByIdAndDelete(id).lean()
    if (!deleted) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: deleted })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("DELETE /users/[id] error", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
