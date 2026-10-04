import { NextResponse } from "next/server";
import { readSessionNode } from "@/lib/session";
import { gasImportStudents } from "@/lib/gas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session || session.role === "kepsek" || session.role === "wali_kelas") {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk mengimpor siswa." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return NextResponse.json({ error: "Tidak ada data siswa untuk diimpor." }, { status: 400 });
    if (rows.length > 3000) return NextResponse.json({ error: "Maksimal 3000 siswa per impor." }, { status: 400 });
    const normalized = rows.map((r: Record<string, unknown>) => ({
      ...r,
      School: session.scope === "all" ? String(r.School || "") : session.school,
      school: session.scope === "all" ? String(r.School || r.school || "") : session.school,
    }));
    const result = await gasImportStudents(normalized);
    if (result.success === false) return NextResponse.json({ error: result.message || "Import GAS gagal." }, { status: 502 });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[students/import]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal mengimpor siswa." }, { status: 500 });
  }
}
