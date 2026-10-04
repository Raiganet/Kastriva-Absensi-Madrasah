"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ScrollText, ShieldCheck } from "lucide-react";

type LogRow = { timestamp?: string; action?: string; status?: string; ipAddress?: string };

function tone(status = "") {
  const s = status.toLowerCase();
  if (s.includes("200") || s.includes("success")) return "bg-emerald-500/10 text-emerald-300 border-emerald-400/20";
  if (s.includes("400") || s.includes("401") || s.includes("403") || s.includes("409") || s.includes("error") || s.includes("fail")) return "bg-rose-500/10 text-rose-300 border-rose-400/20";
  return "bg-slate-500/10 text-slate-300 border-slate-400/20";
}

export default function AuditPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit?limit=500", { cache: "no-store" });
      const body = await res.json();
      setRows(Array.isArray(body) ? body : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return rows;
    return rows.filter((r) => [r.timestamp, r.action, r.status, r.ipAddress].some((v) => String(v || "").toLowerCase().includes(x)));
  }, [rows, q]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-300/80 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Keamanan</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Audit Log</h1>
          <p className="text-sm text-slate-400 mt-1">Riwayat aktivitas backend untuk membantu penelusuran perubahan dan gangguan.</p>
        </div>
        <button onClick={load} disabled={loading} className="glass-button px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
        </button>
      </header>

      <section className="glass-card p-4 sm:p-5">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aksi, status, IP..." className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" />
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/[0.04] text-slate-400 uppercase text-[10px] tracking-wider">
              <tr><th className="p-3">Waktu</th><th className="p-3">Aksi</th><th className="p-3">Status</th><th className="p-3">IP</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((r, i) => (
                <tr key={`${r.timestamp}-${i}`} className="hover:bg-white/[0.03]">
                  <td className="p-3 font-mono text-xs whitespace-nowrap">{r.timestamp || "-"}</td>
                  <td className="p-3 font-medium text-white">{r.action || "-"}</td>
                  <td className="p-3"><span className={`inline-flex px-2 py-1 rounded-lg border text-xs ${tone(r.status)}`}>{r.status || "-"}</span></td>
                  <td className="p-3 font-mono text-xs text-slate-500">{r.ipAddress || "-"}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-500"><ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />Belum ada log yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
