"use client";

import { useEffect, useMemo, useState } from "react";
import { Maximize2, Minimize2, Radio, UsersRound, Clock3, GraduationCap } from "lucide-react";

type Stu = { Student_ID?: string; Student_Name?: string; Class_Name?: string };
type Att = { Student_ID?: string; Student_Name?: string; Class_Name?: string; Status?: string; Date_String?: string; Time_String?: string };

type Settings = Record<string, string>;

function todayYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function MonitorPage() {
  const [students, setStudents] = useState<Stu[]>([]);
  const [attendance, setAttendance] = useState<Att[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [updated, setUpdated] = useState("");
  const [full, setFull] = useState(false);

  async function load() {
    const [s, a, st] = await Promise.all([
      fetch("/api/students", { cache: "no-store" }),
      fetch("/api/attendance", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
    ]);
    setStudents(await s.json()); setAttendance(await a.json()); setSettings(await st.json());
    setUpdated(new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fn = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const today = todayYmd();
  const stats = useMemo(() => {
    const todayRows = attendance.filter((a) => a.Date_String === today);
    const bySid = new Map<string, Att[]>();
    todayRows.forEach((a) => { const sid = a.Student_ID || ""; if (!bySid.has(sid)) bySid.set(sid, []); bySid.get(sid)!.push(a); });
    const hadir = bySid.size;
    const terlambat = Array.from(bySid.values()).filter((rows) => rows.some((r) => (r.Status || "").toLowerCase().includes("terlambat"))).length;
    const latest = [...todayRows].sort((a,b) => String(`${b.Date_String} ${b.Time_String}`).localeCompare(String(`${a.Date_String} ${a.Time_String}`))).slice(0, 8);
    return { hadir, belum: Math.max(0, students.length - hadir), terlambat, latest };
  }, [students, attendance, today]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] rounded-3xl bg-[#060b18] border border-white/10 overflow-hidden p-5 sm:p-8 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_0%,rgba(14,165,233,.16),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(99,102,241,.16),transparent_30%)]" />
      <div className="relative z-10 space-y-7">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/kastriva-absensi-mark.svg" alt="Kastriva Absensi" className="w-14 h-14 rounded-2xl" />
            <div>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold"><Radio className="w-4 h-4 animate-pulse" /> LIVE · diperbarui 10 detik</div>
              <h1 className="text-2xl sm:text-4xl font-black text-white mt-1">{settings.school_name || "Kastriva-Absensi"}</h1>
              <p className="text-slate-400 text-sm mt-1">Monitoring kehadiran hari ini · update {updated || "-"}</p>
            </div>
          </div>
          <button onClick={toggleFullscreen} className="glass-button p-3 rounded-xl" title="Fullscreen">{full ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat title="Total Siswa" value={students.length} icon={<UsersRound />} tone="text-indigo-300" />
          <Stat title="Hadir" value={stats.hadir} icon={<GraduationCap />} tone="text-emerald-300" />
          <Stat title="Terlambat" value={stats.terlambat} icon={<Clock3 />} tone="text-amber-300" />
          <Stat title="Belum Absen" value={stats.belum} icon={<Clock3 />} tone="text-slate-300" />
        </div>

        <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4">Scan Terbaru</h2>
            <div className="space-y-2">
              {stats.latest.map((a, i) => (
                <div key={`${a.Student_ID}-${a.Time_String}-${i}`} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-200 font-bold">{(a.Student_Name || "?").charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><div className="font-semibold text-white truncate">{a.Student_Name}</div><div className="text-xs text-slate-500">{a.Class_Name} · {a.Student_ID}</div></div>
                  <div className="text-right"><div className={`text-xs font-bold ${(a.Status || "").toLowerCase().includes("terlambat") ? "text-amber-300" : "text-emerald-300"}`}>{a.Status}</div><div className="font-mono text-sm text-slate-300 mt-1">{a.Time_String}</div></div>
                </div>
              ))}
              {stats.latest.length === 0 && <div className="text-center text-slate-500 py-12">Belum ada scan hari ini.</div>}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6 flex flex-col justify-center text-center">
            <div className="text-slate-400 text-sm">Progres Kehadiran</div>
            <div className="text-6xl sm:text-7xl font-black text-white mt-3">{students.length ? Math.round((stats.hadir / students.length) * 100) : 0}%</div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden mt-6"><div className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${students.length ? Math.min(100, (stats.hadir / students.length) * 100) : 0}%` }} /></div>
            <p className="text-sm text-slate-400 mt-4">{stats.hadir} dari {students.length} siswa sudah tercatat hadir.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({title, value, icon, tone}:{title:string; value:number; icon:React.ReactNode; tone:string}) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><div className={`w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center ${tone}`}>{icon}</div><div className="text-slate-400 text-xs mt-4">{title}</div><div className="text-3xl sm:text-4xl font-black text-white mt-1">{value}</div></div>;
}
