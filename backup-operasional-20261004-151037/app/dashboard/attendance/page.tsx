"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, RefreshCw, Search } from "lucide-react";

type Attendance = { ID?: string; Student_ID?: string; Student_Name?: string; Class_Name?: string; Status?: string; Date_String?: string; Time_String?: string };
type Student = { Student_ID?: string; Student_Name?: string; Class_Name?: string; Parent_Name?: string; Parent_Phone?: string };

function waPhone(raw?: string) {
  let p = String(raw || "").replace(/\D/g, "");
  if (!p) return "";
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}
function statusTone(status?: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("terlambat")) return "bg-amber-500/10 text-amber-300 border-amber-400/20";
  if (s.includes("sakit")) return "bg-yellow-500/10 text-yellow-300 border-yellow-400/20";
  if (s.includes("izin")) return "bg-sky-500/10 text-sky-300 border-sky-400/20";
  if (s.includes("alfa") || s.includes("alpha")) return "bg-rose-500/10 text-rose-300 border-rose-400/20";
  if (s.includes("pulang")) return "bg-cyan-500/10 text-cyan-300 border-cyan-400/20";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-400/20";
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [a,s,st] = await Promise.all([fetch("/api/attendance", {cache:"no-store"}), fetch("/api/students", {cache:"no-store"}), fetch("/api/settings", {cache:"no-store"})]);
      setAttendance(await a.json()); setStudents(await s.json()); setSettings(await st.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);
  const byStudent = useMemo(() => new Map(students.map((s) => [s.Student_ID || "", s])), [students]);
  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    const list = [...attendance].reverse();
    if (!x) return list;
    return list.filter((a) => [a.Student_ID,a.Student_Name,a.Class_Name,a.Status,a.Date_String].some((v)=>String(v||"").toLowerCase().includes(x)));
  }, [attendance,q]);

  function openWhatsApp(a: Attendance) {
    const st = byStudent.get(a.Student_ID || "");
    const phone = waPhone(st?.Parent_Phone);
    if (!phone) { alert("Nomor WhatsApp orang tua belum tersedia pada data siswa."); return; }
    const school = settings.school_name || "Sekolah";
    const parent = st?.Parent_Name ? `Bapak/Ibu ${st.Parent_Name}` : "Bapak/Ibu Orang Tua/Wali";
    const msg = `${parent},\n\nInformasi kehadiran dari ${school}:\n\nNama: ${a.Student_Name || "-"}\nNIS: ${a.Student_ID || "-"}\nKelas: ${a.Class_Name || "-"}\nStatus: ${a.Status || "-"}\nTanggal: ${a.Date_String || "-"}\nJam: ${a.Time_String || "-"}\n\nPesan ini disiapkan oleh Kastriva-Absensi.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-extrabold text-white">Riwayat Log Kehadiran</h1><p className="text-sm text-slate-400 mt-1">Catatan scan terbaru dan tombol WhatsApp orang tua/wali.</p></div>
        <button onClick={fetchData} className="glass-button px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`} /> Refresh</button>
      </header>

      <section className="glass-card p-4"><div className="relative max-w-xl"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari nama, NIS, kelas, status..." className="glass-input w-full pl-10 pr-3 py-2.5 text-sm"/></div></section>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/[0.04] text-slate-400 uppercase text-[10px] tracking-wider">
              <tr><th className="p-3">ID</th><th className="p-3">NIS</th><th className="p-3">Nama</th><th className="p-3">Kelas</th><th className="p-3">Status</th><th className="p-3">Tanggal</th><th className="p-3">Jam</th><th className="p-3 text-right">Orang Tua</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((a, i) => {
                const st = byStudent.get(a.Student_ID || "");
                const hasPhone = Boolean(waPhone(st?.Parent_Phone));
                return <tr key={`${a.ID}-${i}`} className="hover:bg-white/[0.03]">
                  <td className="p-3 font-mono text-slate-500">{a.ID}</td><td className="p-3 font-mono text-indigo-300">{a.Student_ID}</td><td className="p-3 font-semibold text-white">{a.Student_Name}</td><td className="p-3">{a.Class_Name}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded-lg border ${statusTone(a.Status)}`}>{a.Status}</span></td><td className="p-3">{a.Date_String}</td><td className="p-3 font-mono">{a.Time_String}</td>
                  <td className="p-3 text-right"><button disabled={!hasPhone} onClick={()=>openWhatsApp(a)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${hasPhone?"bg-emerald-500/10 text-emerald-300 border-emerald-400/20 hover:bg-emerald-500/20":"opacity-35 cursor-not-allowed border-white/10"}`}><MessageCircle className="w-3.5 h-3.5"/> WhatsApp</button></td>
                </tr>;
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-slate-500">Belum ada data kehadiran.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
