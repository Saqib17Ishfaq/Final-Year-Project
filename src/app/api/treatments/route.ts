import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Treatment from "@/models/Treatment";

export async function GET() {
  try {
    await dbConnect();
    const treatments = await Treatment.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: treatments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("GET /api/treatments error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.name || typeof body.price !== "number") {
      return NextResponse.json({ success: false, error: "Name and price are required" }, { status: 400 });
    }

    await dbConnect();

    const treatment = await Treatment.create({
      name: body.name,
      code: body.code,
      description: body.description,
      price: body.price,
      currency: body.currency || "PKR",
      durationMinutes: body.durationMinutes,
      type: body.type,
      active: body.active !== false,
    });

    return NextResponse.json({ success: true, data: treatment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("POST /api/treatments error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.id || !body?.name || typeof body.price !== "number") {
      return NextResponse.json({ success: false, error: "Id, name and price are required" }, { status: 400 });
    }

    await dbConnect();

    const treatment = await Treatment.findByIdAndUpdate(
      body.id,
      {
        $set: {
          name: body.name,
          code: body.code,
          description: body.description,
          price: body.price,
          currency: body.currency || "PKR",
          durationMinutes: body.durationMinutes,
          type: body.type,
          active: body.active !== false,
        },
      },
      { new: true }
    );

    if (!treatment) {
      return NextResponse.json({ success: false, error: "Treatment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: treatment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("PUT /api/treatments error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Id is required" }, { status: 400 });
    }

    await dbConnect();

    const deleted = await Treatment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Treatment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("DELETE /api/treatments error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
