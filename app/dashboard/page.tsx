"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import {
  Users, UserCheck, UserX, Thermometer, Mail, Clock,
  ClipboardList, Search, RotateCcw, ArrowRight, CalendarDays, PartyPopper,
} from "lucide-react";

ChartJS.register(ArcElement, Tooltip, ChartLegend, CategoryScale, LinearScale, BarElement);

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const TZ = "Asia/Jakarta";

type Cat = "hadir" | "sakit" | "izin" | "alfa" | "belum";
type RecCat = "hadir" | "sakit" | "izin" | "alfa";
type Att = { Student_ID?: string; Status?: string; Date_String?: string; Time_String?: string };
type Stu = { Student_ID?: string; Student_Name?: string; Class_Name?: string };
type Row = Stu & { cat: Cat; masuk?: string; pulang?: string; catTime?: string };
type ClsStat = { cls: string; total: number; hadir: number; sakit: number; izin: number; alfa: number; belum: number };
type DayInfo = { cats: Set<RecCat>; masuk?: string; pulang?: string; tByCat: Record<string, string> };

const SEV: Record<Cat, number> = { belum: 0, alfa: 1, sakit: 2, izin: 3, hadir: 4 };

const CAT_META: Record<Cat, { label: string; dot: string; text: string; solid: string; badge: string; chip: string; row: string; ring: string }> = {
  hadir: { label: "Hadir", dot: "bg-emerald-400", text: "text-emerald-300", solid: "#10B981", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30", chip: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200", row: "", ring: "ring-emerald-400/50" },
  sakit: { label: "Sakit", dot: "bg-amber-400", text: "text-amber-300", solid: "#F59E0B", badge: "bg-amber-500/15 text-amber-300 border-amber-400/30", chip: "bg-amber-500/20 border-amber-400/40 text-amber-200", row: "bg-amber-500/[0.06]", ring: "ring-amber-400/50" },
  izin:  { label: "Izin",  dot: "bg-sky-400",     text: "text-sky-300",     solid: "#0EA5E9", badge: "bg-sky-500/15 text-sky-300 border-sky-400/30",     chip: "bg-sky-500/20 border-sky-400/40 text-sky-200",     row: "bg-sky-500/[0.06]",     ring: "ring-sky-400/50" },
  alfa:  { label: "Alfa",  dot: "bg-rose-400",    text: "text-rose-300",    solid: "#F43F5E", badge: "bg-rose-500/15 text-rose-300 border-rose-400/30",    chip: "bg-rose-500/20 border-rose-400/40 text-rose-200",    row: "bg-rose-500/[0.07]",    ring: "ring-rose-400/50" },
  belum: { label: "Belum", dot: "bg-slate-400",   text: "text-slate-300",   solid: "#94A3B8", badge: "bg-slate-500/15 text-slate-300 border-slate-400/30", chip: "bg-slate-500/20 border-slate-400/40 text-slate-200", row: "bg-slate-500/[0.06]",   ring: "ring-slate-400/50" },
};
const CAT_ORDER: Cat[] = ["hadir", "sakit", "izin", "alfa", "belum"];

function todayYMD() { return new Date().toLocaleDateString("sv-SE", { timeZone: TZ }); }
function todayIndo() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return HARI[d.getDay()] + ", " + d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
}
function hm(t?: string) { return t ? t.slice(0, 5) : "—"; }
function recCat(status?: string): RecCat {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("sakit")) return "sakit";
  if (s.includes("izin")) return "izin";
  if (s.includes("alfa") || s.includes("alpha")) return "alfa";
  return "hadir";
}
function dominant(cats: Set<RecCat>): Cat {
  if (cats.has("sakit")) return "sakit";
  if (cats.has("izin")) return "izin";
  if (cats.has("alfa")) return "alfa";
  return "hadir";
}
function subText(r: Row): string | null {
  if (r.cat === "belum") return null;
  if (r.cat === "hadir") {
    const p: string[] = [];
    if (r.masuk) p.push("Masuk " + hm(r.masuk));
    if (r.pulang) p.push("Pulang " + hm(r.pulang));
    return p.length ? p.join(" · ") : null;
  }
  return CAT_META[r.cat].label + (r.catTime ? " " + hm(r.catTime) : "");
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Stu[]>([]);
  const [attendance, setAttendance] = useState<Att[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [live, setLive] = useState(true);

  const [fStatus, setFStatus] = useState<"all" | Cat>("all");
  const [fClass, setFClass] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function load(silent = false) {
      try {
        if (!silent) setLoading(true);
        const [sRes, aRes, stRes] = await Promise.all([
          fetch("/api/students", { cache: "no-store" }),
          fetch("/api/attendance", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);
        const [sData, aData, stData] = await Promise.all([sRes.json(), aRes.json(), stRes.json()]);
        if (cancelled) return;
        setStudents(Array.isArray(sData) ? sData : []);
        setAttendance(Array.isArray(aData) ? aData : []);
        const cfg = stData && typeof stData === "object" && !Array.isArray(stData) ? stData : {};
        setSettings(cfg);
        setLastUpdated(new Date());
        setErr("");
        const sec = Math.max(10, Math.min(60, Number(cfg.live_refresh_seconds || 15)));
        if (timer) clearInterval(timer);
        if (live) timer = setInterval(() => load(true), sec * 1000);
      } catch (e) { if (!cancelled) setErr(e instanceof Error ? e.message : "Gagal memuat data."); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [live]);

  useEffect(() => { setLimit(50); }, [fStatus, fClass, q]);

  const today = todayYMD();

  const bySid = useMemo(() => {
    const m: Record<string, DayInfo> = {};
    attendance.forEach((a) => {
      if ((a.Date_String || "") !== today) return;
      const sid = a.Student_ID || ""; if (!sid) return;
      let info = m[sid];
      if (!info) { info = { cats: new Set<RecCat>(), tByCat: {} }; m[sid] = info; }
      const c = recCat(a.Status); info.cats.add(c);
      const t = a.Time_String || "";
      if (!info.tByCat[c]) info.tByCat[c] = t;
      const st = (a.Status || "").toLowerCase();
      if (st.includes("masuk") && !info.masuk) info.masuk = t;
      if (st.includes("pulang") && !info.pulang) info.pulang = t;
    });
    return m;
  }, [attendance, today]);

  const rows: Row[] = useMemo(() => students.map((s) => {
    const sid = s.Student_ID || "";
    const info = bySid[sid];
    if (!info) return { ...s, cat: "belum" as Cat };
    const dom = dominant(info.cats);
    return { ...s, cat: dom, masuk: info.masuk, pulang: info.pulang, catTime: info.tByCat[dom] };
  }), [students, bySid]);

  const counts = useMemo(() => {
    const c: Record<Cat, number> = { hadir: 0, sakit: 0, izin: 0, alfa: 0, belum: 0 };
    rows.forEach((r) => { c[r.cat]++; });
    return c;
  }, [rows]);

  const total = rows.length;
  const scanToday = useMemo(() => attendance.filter((a) => (a.Date_String || "") === today).length, [attendance, today]);
  const lateToday = useMemo(() => attendance.filter((a) => (a.Date_String || "") === today && (a.Status || "").toLowerCase().includes("terlambat")).length, [attendance, today]);

  const classStats = useMemo(() => {
    const m: Record<string, ClsStat> = {};
    rows.forEach((r) => {
      const c = r.Class_Name || "-";
      if (!m[c]) m[c] = { cls: c, total: 0, hadir: 0, sakit: 0, izin: 0, alfa: 0, belum: 0 };
      const o = m[c]; o.total++; o[r.cat]++;
    });
    return Object.values(m).sort((a, b) => a.cls.localeCompare(b.cls));
  }, [rows]);
  const classOptions = classStats.map((c) => c.cls);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (fStatus !== "all" && r.cat !== fStatus) return false;
      if (fClass && (r.Class_Name || "-") !== fClass) return false;
      if (ql && !((r.Student_Name || "").toLowerCase().includes(ql) || (r.Student_ID || "").toLowerCase().includes(ql))) return false;
      return true;
    });
    list.sort((a, b) => (SEV[a.cat] - SEV[b.cat]) || (a.Class_Name || "").localeCompare(b.Class_Name || "") || (a.Student_Name || "").localeCompare(b.Student_Name || ""));
    return list;
  }, [rows, fStatus, fClass, q]);

  const visible = filtered.slice(0, limit);
  const filterActive = fStatus !== "all" || fClass !== "" || q.trim() !== "";

  const pieData = { labels: CAT_ORDER.map((c) => CAT_META[c].label), datasets: [{ data: CAT_ORDER.map((c) => counts[c]), backgroundColor: CAT_ORDER.map((c) => CAT_META[c].solid), borderColor: "rgba(15,23,42,0.6)", borderWidth: 3 }] };
  const pieOpts: any = { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { labels: { color: "#cbd5e1", font: { size: 11 } } } } };
  const barData = {
    labels: classStats.map((c) => c.cls),
    datasets: CAT_ORDER.map((cat) => ({ label: CAT_META[cat].label, data: classStats.map((c) => c[cat]), backgroundColor: CAT_META[cat].solid, borderRadius: 3, stack: "s" })),
  };
  const barOpts: any = { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { color: "#64748b", precision: 0, font: { size: 10 } }, grid: { color: "rgba(148,163,184,0.08)" } } }, plugins: { legend: { labels: { color: "#cbd5e1", font: { size: 11 } } } } };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-300">Memuat dashboard…</div>;

  const catCards: { cat: Cat; icon: ReactNode }[] = [
    { cat: "hadir", icon: <UserCheck className="w-5 h-5" /> },
    { cat: "sakit", icon: <Thermometer className="w-5 h-5" /> },
    { cat: "izin", icon: <Mail className="w-5 h-5" /> },
    { cat: "alfa", icon: <UserX className="w-5 h-5" /> },
    { cat: "belum", icon: <Clock className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{settings.school_name || "Kastriva Absensi"}</h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-300" /> {todayIndo()}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`px-2.5 py-1.5 rounded-full border ${live ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10" : "text-slate-400 border-white/10 bg-white/5"}`}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${live ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            {live ? "LIVE" : "Dijeda"}
          </span>
          <button onClick={() => setLive((v) => !v)} className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300">{live ? "Jeda" : "Aktifkan"}</button>
          {lastUpdated && <span className="text-slate-500 hidden sm:inline">Update {lastUpdated.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</span>}
        </div>
      </header>

      {err && <div className="glass-card p-4 text-sm text-rose-200 border-rose-400/30">{err}</div>}

      {/* ===== KARTU KATEGORI (bisa diklik = filter) ===== */}
           {/* ===== KARTU KATEGORI: baris utama + pemisah emas + baris rincian ===== */}
      {(() => {
        // satu definisi kartu -> baris atas & bawah pasti identik
        const card = (cat: Cat) => {
          const m = CAT_META[cat];
          const active = fStatus === cat;
          const count = counts[cat];
          const pulse = cat === "belum" && count > 0;
          const iconNode = catCards.find((c) => c.cat === cat)?.icon;
          return (
            <button
              onClick={() => setFStatus((p) => (p === cat ? "all" : cat))}
              className={`glass-card p-3 sm:p-4 text-left transition hover:-translate-y-0.5 ${active ? "ring-2 " + m.ring : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/5 ${m.text}`}>
                  {iconNode}
                  {pulse && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <span className={`w-2 h-2 rounded-full ${m.dot}`} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-2.5 sm:mt-3 truncate">{m.label}</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight tabular">{count}</h3>
            </button>
          );
        };

        const totalCard = (
          <div className="glass-card p-3 sm:p-4 text-left">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white/5 text-indigo-300">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-2.5 sm:mt-3">Total Siswa</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight tabular">{total}</h3>
          </div>
        );

        // pemisah emas premium: garis gradien + 3 berlian bercahaya di tengah
        const goldLine = (
          <div className="flex items-center gap-2.5 py-0.5" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300/40 to-amber-300/70" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gradient-to-br from-amber-200 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]" />
            <span className="h-2 w-2 rotate-45 bg-gradient-to-br from-amber-100 to-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gradient-to-br from-amber-200 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-300/40 to-amber-300/70" />
          </div>
        );

        return (
          <div className="space-y-3 sm:space-y-4">
            {/* baris utama: headline operasional */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {card("hadir")}
              {card("belum")}
              {totalCard}
            </div>

            {goldLine}

            {/* baris rincian: alasan ketidakhadiran */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {card("sakit")}
              {card("izin")}
              {card("alfa")}
            </div>
          </div>
        );
      })()}

      {/* legend warna */}
      <div className="glass-card px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
        <span className="text-slate-400 font-semibold mr-1">Keterangan warna:</span>
        {CAT_ORDER.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-slate-300"><i className={`w-2.5 h-2.5 rounded-full ${CAT_META[c].dot}`} /> {CAT_META[c].label}</span>
        ))}
        <span className="text-amber-300/90">Terlambat: <span className="font-semibold">{lateToday}</span></span>
        <span className="text-slate-500 ml-auto">Total scan hari ini: <span className="text-slate-200 font-semibold">{scanToday}</span></span>
      </div>

      {/* ===== CHART ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-4">Komposisi Kehadiran Hari Ini</h3>
          <div className="h-56 flex items-center justify-center"><Pie data={pieData} options={pieOpts} /></div>
        </div>
        <div className="glass-card p-5 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-1">Sebaran Per Kelas</h3>
          <p className="text-[11px] text-slate-500 mb-3">Tumpukan warna = Hadir / Sakit / Izin / Alfa / Belum per kelas.</p>
          <div className="h-56"><Bar data={barData} options={barOpts} /></div>
        </div>
      </div>

      {/* ===== RINGKASAN PER KELAS (stacked bar) ===== */}
      <div className="glass-card p-5 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-4">Ringkasan Per Kelas <span className="text-[11px] font-normal text-slate-500">(klik untuk memfilter)</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {classStats.map((c) => {
            const pct = c.total > 0 ? Math.round((c.hadir / c.total) * 100) : 0;
            const full = c.hadir >= c.total && c.total > 0;
            const problems = (["sakit", "izin", "alfa", "belum"] as Cat[]).filter((k) => c[k] > 0);
            return (
              <button key={c.cls} onClick={() => setFClass((p) => (p === c.cls ? "" : c.cls))}
                className={`text-left p-4 rounded-2xl border transition hover:-translate-y-0.5 ${fClass === c.cls ? "bg-indigo-500/15 border-indigo-400/40" : "bg-white/[0.03] border-white/10 hover:border-white/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{c.cls}</span>
                  <span className={`text-[10px] font-mono ${full ? "text-emerald-300" : "text-amber-300"}`}>{full ? "LENGKAP" : pct + "%"}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-extrabold text-white">{c.hadir}</span>
                  <span className="text-[11px] text-slate-500">/ {c.total} hadir</span>
                </div>
                <StackedBar c={c} />
                <div className="mt-2 text-[10px]">
                  {problems.length === 0 ? (
                    <span className="text-emerald-300">✓ Semua hadir</span>
                  ) : (
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {problems.map((k) => (
                        <span key={k} className={`flex items-center gap-1 ${CAT_META[k].text}`}><i className={`w-1.5 h-1.5 rounded-full ${CAT_META[k].dot}`} />{CAT_META[k].label} {c[k]}</span>
                      ))}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== DAFTAR KEHADIRAN (filter per kategori) ===== */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-300" /> Daftar Kehadiran Siswa</h3>
            <p className="text-xs text-slate-400 mt-0.5">Klik kartu / chip kategori untuk melihat siapa saja · yang butuh perhatian tampil paling atas</p>
          </div>
          <a href="/dashboard/students" className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1 whitespace-nowrap">Kelola Siswa <ArrowRight className="w-3.5 h-3.5" /></a>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            <Chip active={fStatus === "all"} onClick={() => setFStatus("all")} label="Semua" count={total} />
            {CAT_ORDER.map((c) => (
              <Chip key={c} active={fStatus === c} onClick={() => setFStatus(c)} label={CAT_META[c].label} count={counts[c]} tone={c} pulse={c === "belum" && counts.belum > 0} />
            ))}
          </div>
          <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:items-center">
            <select value={fClass} onChange={(e) => setFClass(e.target.value)} className="px-3 py-2.5 text-sm sm:max-w-[180px]" aria-label="Filter kelas">
              <option value="">Semua Kelas</option>
              {classOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIS…" className="w-full pl-9 pr-3 py-2.5 text-sm" />
            </div>
            {filterActive && (
              <button onClick={() => { setFStatus("all"); setFClass(""); setQ(""); }} className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/15 hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] sm:text-xs">
                <th className="p-3 hidden lg:table-cell">NIS</th>
                <th className="p-3">Nama</th>
                <th className="p-3">Kelas</th>
                <th className="p-3 hidden md:table-cell">Masuk</th>
                <th className="p-3 hidden md:table-cell">Pulang</th>
                <th className="p-3 text-right">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((r) => {
                const m = CAT_META[r.cat]; const sub = subText(r);
                return (
                  <tr key={r.Student_ID} className={"transition-colors " + (r.cat !== "hadir" ? m.row : "") + " hover:bg-white/[0.04]"}>
                    <td className="p-3 font-mono text-indigo-300 hidden lg:table-cell whitespace-nowrap">{r.Student_ID}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white whitespace-nowrap">{r.Student_Name}</div>
                      <div className="lg:hidden text-[11px] font-mono text-indigo-300/80">{r.Student_ID}</div>
                      {sub && <div className={`md:hidden text-[11px] mt-0.5 ${m.text}`}>{sub}</div>}
                    </td>
                    <td className="p-3 whitespace-nowrap">{r.Class_Name}</td>
                    <td className="p-3 font-mono text-slate-400 hidden md:table-cell whitespace-nowrap">{hm(r.masuk)}</td>
                    <td className="p-3 font-mono text-slate-400 hidden md:table-cell whitespace-nowrap">{hm(r.pulang)}</td>
                    <td className="p-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${m.badge}`}>
                        <i className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                        {m.label}{r.cat !== "hadir" && r.catTime ? " · " + hm(r.catTime) : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    {fStatus !== "all" && counts[fStatus] === 0 ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-300">
                        <PartyPopper className="w-8 h-8" />
                        <p className="font-semibold">Tidak ada siswa berstatus {CAT_META[fStatus].label} hari ini 👍</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Search className="w-7 h-7 opacity-60" />
                        <p className="text-sm">Tidak ada siswa sesuai filter.</p>
                        <button onClick={() => { setFStatus("all"); setFClass(""); setQ(""); }} className="text-xs text-indigo-300 hover:text-indigo-200">Hapus filter</button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 text-[11px] text-slate-500">
          <span>Menampilkan <span className="text-slate-300 font-semibold">{visible.length}</span> dari {filtered.length} siswa{filterActive ? " · filter aktif" : ""}</span>
          {filtered.length > limit && (
            <div className="flex items-center gap-3">
              <button onClick={() => setLimit((l) => l + 50)} className="px-3 py-1.5 rounded-lg text-slate-200 border border-white/15 hover:bg-white/10 font-semibold">+ 50 lagi</button>
              <button onClick={() => setLimit(filtered.length)} className="text-indigo-300 hover:text-indigo-200">tampilkan semua ({filtered.length})</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- sub-komponen ---------- */
function StackedBar({ c }: { c: ClsStat }) {
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
      {CAT_ORDER.map((k) => (c[k] > 0 ? <i key={k} className="h-full" style={{ width: (c[k] / c.total) * 100 + "%", background: CAT_META[k].solid }} /> : null))}
    </div>
  );
}

function Chip({ active, onClick, label, count, tone, pulse }: { active: boolean; onClick: () => void; label: string; count: number; tone?: Cat; pulse?: boolean }) {
  const style = active && tone ? CAT_META[tone].chip : active ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200" : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20";
  return (
    <button onClick={onClick} className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition active:scale-95 ${style}`}>
      <span className="relative flex items-center">
        {pulse && !active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />}
        {label}
      </span>
      <span className={`font-mono px-1.5 py-0.5 rounded-md text-[10px] ${active ? "bg-black/20" : "bg-white/10"}`}>{count}</span>
    </button>
  );
}
