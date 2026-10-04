import { NextResponse } from "next/server";
import { readSessionNode } from "@/lib/session";
import { can } from "@/lib/rbac";
import { gasBackupDatabase } from "@/lib/gas";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    if (!can(session.role, "manage_backup")) return NextResponse.json({ error: "Hanya pengelola yang dapat membuat backup." }, { status: 403 });
    const result = await gasBackupDatabase();
    if (result.success === false) return NextResponse.json({ error: result.message || "Gagal membuat backup." }, { status: 502 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat backup." }, { status: 502 });
  }
}
