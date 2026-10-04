import { NextResponse } from "next/server";
import { readSessionNode } from "@/lib/session";
import {
  gasDeleteStudent,
  gasGetStudents,
  gasSaveStudent,
  mapGasStudent,
  toGasStudentInput,
} from "@/lib/gas";

export const runtime = "nodejs";

function visibleForSession(row: Record<string, string>, session: Awaited<ReturnType<typeof readSessionNode>>) {
  if (!session) return false;
  if (session.scope === "school" && session.school !== "all") {
    return row.School.trim() === session.school;
  }
  if (session.scope === "class") {
    const classSet = new Set(session.classes.map((value) => value.toLowerCase()));
    return row.School.trim() === session.school && classSet.has(row.Class_Name.trim().toLowerCase());
  }
  return true;
}

export async function GET() {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    const result = await gasGetStudents();
    if (result.success === false) {
      return NextResponse.json({ error: result.message || "GAS gagal memuat siswa." }, { status: 502 });
    }
    const rows = (result.data || []).map(mapGasStudent);
    return NextResponse.json(rows.filter((row) => visibleForSession(row, session)));
  } catch (error) {
    console.error("[students] GAS GET", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat data siswa." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session || session.role === "kepsek" || session.role === "wali_kelas") {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk mengubah data siswa." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = toGasStudentInput(body);
    if (!input.studentId || !input.studentName) {
      return NextResponse.json({ error: "NIS dan nama siswa wajib diisi." }, { status: 400 });
    }

    // School is controlled by the web session for scoped administrators.
    if (session.scope === "school" && session.school !== "all") input.school = session.school;

    const result = await gasSaveStudent(input);
    if (result.success === false) {
      return NextResponse.json({ error: result.message || "GAS gagal menyimpan siswa." }, { status: 502 });
    }
    return NextResponse.json({ success: true, ...(result as Record<string, unknown>) });
  } catch (error) {
    console.error("[students] GAS POST", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan siswa." }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session || session.role === "kepsek" || session.role === "wali_kelas") {
      return NextResponse.json({ error: "Anda tidak memiliki izin untuk menghapus siswa." }, { status: 403 });
    }

    const id = (new URL(req.url).searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "NIS diperlukan." }, { status: 400 });

    // Check ownership before asking GAS to delete the row.
    const result = await gasGetStudents();
    if (result.success === false) {
      return NextResponse.json({ error: result.message || "GAS gagal memuat siswa." }, { status: 502 });
    }
    const target = (result.data || []).map(mapGasStudent).find((row) => row.Student_ID === id);
    if (!target) return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    if (!visibleForSession(target, session)) {
      return NextResponse.json({ error: "Anda tidak dapat menghapus siswa dari sekolah/kelas lain." }, { status: 403 });
    }

    const deleted = await gasDeleteStudent(id);
    if (deleted.success === false) {
      return NextResponse.json({ error: deleted.message || "GAS gagal menghapus siswa." }, { status: 502 });
    }
    return NextResponse.json({ success: true, ...(deleted as Record<string, unknown>) });
  } catch (error) {
    console.error("[students] GAS DELETE", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menghapus siswa." }, { status: 502 });
  }
}

