import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import User from "@/models/User"

const ROLES = ["admin", "dentist", "staff"] as const

type Role = (typeof ROLES)[number]

export async function GET() {
  try {
    await dbConnect()
    const users = await User.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, data: users })
  } catch (error: any) {
    console.error("GET /users error", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })

    const { name, email, role, password, image, active } = body as {
      name?: string
      email?: string
      role?: Role
      password?: string
      image?: string
      active?: boolean
    }

    if (!name || !email || !role) {
      return NextResponse.json({ success: false, error: "name, email, and role are required" }, { status: 400 })
    }

    if (!ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
    }

    if (password) {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
      if (!strongPasswordRegex.test(password)) {
        return NextResponse.json({ success: false, error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" }, { status: 400 })
      }
    }

    await dbConnect()

    const existing = await User.findOne({ email }).lean()
    if (existing) {
      return NextResponse.json({ success: false, error: "User with this email already exists" }, { status: 409 })
    }

    const user = await User.create({ name, email, role, password, image, active: active ?? true })
    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error: any) {
    console.error("POST /users error", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
