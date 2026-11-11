import { NextResponse } from "next/server";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

async function connect() {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri);
}

export async function GET() {
  try {
    await connect();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not established");
    await db.admin().command({ ping: 1 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DB test failed", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
