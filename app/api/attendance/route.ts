import { NextResponse } from "next/server";
import { readSessionNode } from "@/lib/session";
import {
  gasGetAttendance,
  gasGetStudents,
  gasRecordAttendance,
  mapGasAttendance,
  mapGasStudent,
} from "@/lib/gas";

export const runtime = "nodejs";

function visibleForSession(row: Record<string, string>, session: Awaited<ReturnType<typeof readSessionNode>>) {
  if (!session) return false;
  if (session.scope === "school" && session.school !== "all") return row.School.trim() === session.school;
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
    const [attendanceResult, studentsResult] = await Promise.all([gasGetAttendance(), gasGetStudents()]);
    if (attendanceResult.success === false) {
      return NextResponse.json({ error: attendanceResult.message || "GAS gagal memuat absensi." }, { status: 502 });
    }

    // Older GAS deployments do not return Attendance.School yet. Build a
    // lookup from Students so existing rows remain visible to scoped admins.
    const schoolByStudent = new Map<string, string>();
    if (studentsResult.success !== false) {
      for (const student of studentsResult.data || []) {
        const row = mapGasStudent(student);
        schoolByStudent.set(row.Student_ID, row.School);
      }
    }

    const rows = (attendanceResult.data || []).map((item) => {
      const rawSchool = typeof item.school === "string" ? item.school : "";
      return mapGasAttendance(item, rawSchool || schoolByStudent.get(String(item.studentId ?? "")) || "");
    });
    return NextResponse.json(rows.filter((row) => visibleForSession(row, session)));
  } catch (error) {
    console.error("[attendance] GAS GET", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat data kehadiran." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const studentId = String(body.Student_ID ?? body.studentId ?? "").trim();
    const status = String(body.Status ?? body.status ?? "Hadir").trim() || "Hadir";
    const notes = String(body.Notes ?? body.notes ?? "").trim();
    if (!studentId) return NextResponse.json({ error: "Student_ID wajib diisi." }, { status: 400 });

    const studentsResult = await gasGetStudents();
    const target = (studentsResult.data || []).map(mapGasStudent).find((row) => row.Student_ID === studentId);
    if (!target) return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    if (!visibleForSession(target, session)) {
      return NextResponse.json({ error: "Anda tidak dapat mencatat siswa dari sekolah/kelas lain." }, { status: 403 });
    }

    const result = await gasRecordAttendance({ studentId, status, notes });
    if (result.success === false) {
      return NextResponse.json(result, { status: result.duplicate ? 409 : 502 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[attendance] GAS POST", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mencatat kehadiran." }, { status: 502 });
  }
}

