"use client";
import { useEffect, useMemo, useState } from "react";
import { FileDown, CalendarDays, Filter, GraduationCap, Users, Loader2, FileText, Printer } from "lucide-react";
import { useToast } from "@/components/ui";
import { downloadRekapPdf, type RekapRow, type RekapSummary } from "@/lib/pdf";

type Cat = "hadir" | "terlambat" | "sakit" | "izin" | "alfa";
type Att = { Student_ID?: string; Student_Name?: string; Class_Name?: string; Status?: string; Date_String?: string };
type Stu = { Student_ID?: string; Student_Name?: string; Class_Name?: string };

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const TZ = "Asia/Jakarta";

function recCat(status?: string): Cat {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("terlambat")) return "terlambat";
  if (s.includes("sakit")) return "sakit";
  if (s.includes("izin")) return "izin";
  if (s.includes("alfa") || s.includes("alpha")) return "alfa";
  return "hadir";
}
function dominant(cats: Set<Cat>): Cat {
  if (cats.has("sakit")) return "sakit";
  if (cats.has("izin")) return "izin";
  if (cats.has("alfa")) return "alfa";
  if (cats.has("terlambat")) return "terlambat";
  return "hadir";
}
function p2(n: number) { return String(n).padStart(2, "0"); }

export default function ReportsPage() {
  const toast = useToast();
  const [students, setStudents] = useState<Stu[]>([]);
  const [attendance, setAttendance] = useState<Att[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [scope, setScope] = useState<"all" | "class" | "student">("all");
  const [scopeValue, setScopeValue] = useState("");
  const [applied, setApplied] = useState<{ start: string; end: string; scope: string; scopeValue: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, a, st] = await Promise.all([fetch("/api/students"), fetch("/api/attendance"), fetch("/api/settings")]);
        setStudents(await s.json()); setAttendance(await a.json()); setSettings(await st.json());
      } catch { toast.error("Gagal memuat data laporan."); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classOptions = useMemo(() => Array.from(new Set(students.map((s) => s.Class_Name || "-"))).sort(), [students]);

  function periodDates(p: string) {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth() + 1;
    if (p === "month") { const last = new Date(y, m, 0).getDate(); return { start: `${y}-${p2(m)}-01`, end: `${y}-${p2(m)}-${p2(last)}` }; }
    if (p === "ganjil") return { start: "2026-07-01", end: "2026-12-31" };
    if (p === "genap") return { start: "2027-01-01", end: "2027-06-30" };
    if (p === "year") return { start: "2026-07-01", end: "2027-06-30" };
    return { start: customStart, end: customEnd };
  }
  function periodLabel(start: string, end: string) {
    const f = (d: string) => { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return d; return `${parseInt(m[3])} ${BULAN[parseInt(m[2]) - 1]} ${m[1]}`; };
    return `${f(start)} s.d. ${f(end)}`;
  }

  const result = useMemo(() => {
    if (!applied) return null;
    const { start, end } = applied;
    const inScope = (s: Stu) => {
      if (applied.scope === "class") return (s.Class_Name || "-") === applied.scopeValue;
      if (applied.scope === "student") return (s.Student_ID || "") === applied.scopeValue;
      return true;
    };
    const scopedStudents = students.filter(inScope);

    // per (siswa+tanggal) -> kategori dominan
    const dayMap: Record<string, Record<string, Set<Cat>>> = {};
    attendance.forEach((a) => {
      const d = a.Date_String || ""; if (!d || d < start || d > end) return;
      const sid = a.Student_ID || "";
      (dayMap[sid] = dayMap[sid] || {});
      (dayMap[sid][d] = dayMap[sid][d] || new Set<Cat>());
      dayMap[sid][d].add(recCat(a.Status));
    });

    const rows: RekapRow[] = scopedStudents.map((s) => {
      const sid = s.Student_ID || "";
      const c = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alfa: 0 };
      const days = dayMap[sid] || {};
      Object.values(days).forEach((set) => { c[dominant(set)]++; });
      return { nis: sid, name: s.Student_Name || "-", cls: s.Class_Name || "-", hadir: c.hadir, terlambat: c.terlambat, sakit: c.sakit, izin: c.izin, alfa: c.alfa, total: c.hadir + c.terlambat + c.sakit + c.izin + c.alfa };
    });
    rows.sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));

    const summary: RekapSummary = rows.reduce((acc, r) => {
      acc.totalSiswa++; acc.totalHadir += r.hadir; acc.totalTerlambat += r.terlambat; acc.totalSakit += r.sakit; acc.totalIzin += r.izin; acc.totalAlfa += r.alfa; return acc;
    }, { totalSiswa: 0, totalHadir: 0, totalTerlambat: 0, totalSakit: 0, totalIzin: 0, totalAlfa: 0 });

    const scopeLabel = applied.scope === "class" ? `Kelas ${applied.scopeValue}`
      : applied.scope === "student" ? `Siswa: ${students.find((x) => x.Student_ID === applied.scopeValue)?.Student_Name || applied.scopeValue}`
      : "Seluruh siswa";

    return { rows, summary, scopeLabel, periodText: periodLabel(start, end) };
  }, [applied, students, attendance]);

  function apply() {
    const { start, end } = periodDates(period);
    if (period === "custom" && (!start || !end)) { toast.warning("Pilih tanggal mulai & selesai."); return; }
    if (scope !== "all" && !scopeValue) { toast.warning("Pilih lingkup terlebih dahulu."); return; }
    setApplied({ start, end, scope, scopeValue });
  }

  function exportPdf() {
    if (!result) return;
    downloadRekapPdf({
      schoolName: settings.school_name || "Kastriva Absensi",
      tagline: settings.school_tagline || "",
      principalName: settings.principal_name || "",
      logoUrl: settings.logo_url || "",
      periodLabel: result.periodText,
      scopeLabel: result.scopeLabel,
      generatedAt: new Date().toLocaleString("id-ID", { timeZone: TZ }),
      rows: result.rows,
      summary: result.summary,
    }, `rekap_${result.scopeLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${applied!.start}_${applied!.end}.pdf`);
    toast.success("PDF rekap sedang diunduh.", "Ekspor berhasil");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-300">Memuat laporan…</div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-300/80 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Laporan</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Laporan &amp; Rekap Kehadiran</h1>
        <p className="text-sm text-slate-400 mt-1">Rakit rekap per periode & lingkup, pratinjau, lalu ekspor PDF ber‑kop surat siap arsip.</p>
      </header>

      {/* filter */}
      <section className="glass-card p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Periode</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full px-3 py-2.5 text-sm">
              <option value="month">Bulan Ini</option>
              <option value="ganjil">Semester Ganjil 2026/2027</option>
              <option value="genap">Semester Genap 2026/2027</option>
              <option value="year">Tahun Ajaran 2026/2027</option>
              <option value="custom">Rentang Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Lingkup</label>
            <select value={scope} onChange={(e) => { setScope(e.target.value as any); setScopeValue(""); }} className="w-full px-3 py-2.5 text-sm">
              <option value="all">Seluruh Siswa</option>
              <option value="class">Per Kelas</option>
              <option value="student">Per Siswa</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
              {scope === "class" ? "Pilih Kelas" : scope === "student" ? "Pilih Siswa" : " "}
            </label>
            {scope === "all" && <div className="px-3 py-2.5 text-sm text-slate-500 border border-dashed border-white/10 rounded-xl">Rekap mencakup semua siswa aktif.</div>}
            {scope === "class" && (
              <select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} className="w-full px-3 py-2.5 text-sm">
                <option value="">-- pilih kelas --</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {scope === "student" && (
              <select value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} className="w-full px-3 py-2.5 text-sm">
                <option value="">-- pilih siswa --</option>
                {students.map((s) => <option key={s.Student_ID} value={s.Student_ID || ""}>{s.Student_Name} ({s.Class_Name})</option>)}
              </select>
            )}
          </div>
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div><label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Tanggal Mulai</label><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2.5 text-sm" /></div>
            <div><label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Tanggal Selesai</label><input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2.5 text-sm" /></div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <button onClick={apply} className="glass-button px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Filter className="w-4 h-4" /> Tampilkan Rekap</button>
          {result && (
            <button onClick={exportPdf} className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition active:scale-95 hover:brightness-110" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.92))", boxShadow: "0 6px 22px rgba(16,185,129,0.4)" }}>
              <FileDown className="w-4 h-4" /> Ekspor PDF Ber‑kop
            </button>
          )}
        </div>
      </section>

      {/* hasil */}
      {result && (
        <>
          <section className="glass-card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">Pratinjau Rekap</h3>
                <p className="text-xs text-slate-400 mt-0.5">{result.scopeLabel} · {result.periodText}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 font-semibold flex items-center gap-1"><Users className="w-3 h-3" /> {result.summary.totalSiswa} siswa</span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 font-semibold">{result.summary.totalHadir} hadir</span>
              </div>
            </div>

            {/* chip ringkasan */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              <SumCard label="Hadir" v={result.summary.totalHadir} dot="bg-emerald-400" text="text-emerald-300" />
              <SumCard label="Terlambat" v={result.summary.totalTerlambat} dot="bg-orange-400" text="text-orange-300" />
              <SumCard label="Sakit" v={result.summary.totalSakit} dot="bg-amber-400" text="text-amber-300" />
              <SumCard label="Izin" v={result.summary.totalIzin} dot="bg-sky-400" text="text-sky-300" />
              <SumCard label="Alfa" v={result.summary.totalAlfa} dot="bg-rose-400" text="text-rose-300" />
              <SumCard label="Siswa" v={result.summary.totalSiswa} dot="bg-indigo-400" text="text-indigo-300" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] sm:text-xs">
                    <th className="p-3">#</th>
                    <th className="p-3">NIS</th>
                    <th className="p-3">Nama</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 text-center">Hadir</th>
                    <th className="p-3 text-center">Telat</th>
                    <th className="p-3 text-center">Sakit</th>
                    <th className="p-3 text-center">Izin</th>
                    <th className="p-3 text-center">Alfa</th>
                    <th className="p-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.rows.map((r, i) => (
                    <tr key={r.nis} className="hover:bg-white/[0.04]">
                      <td className="p-3 text-slate-500">{i + 1}</td>
                      <td className="p-3 font-mono text-indigo-300 whitespace-nowrap">{r.nis}</td>
                      <td className="p-3 font-semibold text-white whitespace-nowrap">{r.name}</td>
                      <td className="p-3 whitespace-nowrap">{r.cls}</td>
                      <td className="p-3 text-center text-emerald-300 font-semibold">{r.hadir}</td>
                      <td className="p-3 text-center text-orange-300">{r.terlambat || "—"}</td>
                      <td className="p-3 text-center text-amber-300">{r.sakit || "—"}</td>
                      <td className="p-3 text-center text-sky-300">{r.izin || "—"}</td>
                      <td className="p-3 text-center text-rose-300">{r.alfa || "—"}</td>
                      <td className="p-3 text-center font-bold text-white">{r.total}</td>
                    </tr>
                  ))}
                  {result.rows.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-slate-500">Tidak ada siswa pada lingkup ini.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!result && (
        <section className="glass-card p-10 text-center">
          <div className="flex justify-center mb-3"><div className="w-14 h-14 rounded-2xl bg-white/5 text-indigo-300 grid place-items-center"><Printer className="w-7 h-7" /></div></div>
          <p className="text-sm text-slate-300 font-semibold">Pilih periode & lingkup, lalu “Tampilkan Rekap”.</p>
          <p className="text-xs text-slate-500 mt-1">Pratinjau tabel akan muncul di sini, siap diekspor jadi PDF ber‑kop surat.</p>
        </section>
      )}
    </div>
  );
}

function SumCard({ label, v, dot, text }: { label: string; v: number; dot: string; text: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
      <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${dot}`} /><span className="text-[11px] text-slate-400">{label}</span></div>
      <p className={`text-xl font-extrabold mt-1 tabular ${text}`}>{v}</p>
    </div>
  );
}