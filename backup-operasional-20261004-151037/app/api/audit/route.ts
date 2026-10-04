import { NextResponse } from "next/server";
import { readSessionNode } from "@/lib/session";
import { can } from "@/lib/rbac";
import { gasGetLogs } from "@/lib/gas";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    if (!can(session.role, "view_audit")) return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    const url = new URL(req.url);
    const limit = Math.max(25, Math.min(1000, Number(url.searchParams.get("limit") || 250)));
    const result = await gasGetLogs(limit);
    if (result.success === false) return NextResponse.json({ error: result.message || "Gagal memuat audit log." }, { status: 502 });
    return NextResponse.json(result.data || []);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat audit log." }, { status: 502 });
  }
}
