import { NextResponse } from "next/server";
import { readSessionNode } from "@/lib/session";
import { gasGetSettings, gasSaveSettings } from "@/lib/gas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    const result = await gasGetSettings();
    if (result.success === false) {
      return NextResponse.json({ error: result.message || "GAS gagal memuat pengaturan." }, { status: 502 });
    }
    return NextResponse.json(result.data || {});
  } catch (error) {
    console.error("[settings] GAS GET", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat pengaturan." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await readSessionNode();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await gasSaveSettings(body);
    if (result.success === false) {
      return NextResponse.json({ error: result.message || "GAS gagal menyimpan pengaturan." }, { status: 502 });
    }
    return NextResponse.json({ success: true, ...(result as Record<string, unknown>) });
  } catch (error) {
    console.error("[settings] GAS POST", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan." }, { status: 502 });
  }
}

