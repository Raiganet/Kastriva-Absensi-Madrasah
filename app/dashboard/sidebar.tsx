"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, GraduationCap, ClipboardList,
  BarChart3, CreditCard, Settings, Menu, X, FileText, Monitor, ScrollText,
} from "lucide-react";
import { useEffect, useState } from "react";
import LogoutButton from "./logout-button";
import { ThemeToggle } from "@/components/ui";
import { useSession } from "@/components/session";
import { NAV_ITEMS } from "@/lib/rbac";

const ICONS: Record<string, any> = {
  LayoutDashboard, Users, GraduationCap, ClipboardList,
  BarChart3, CreditCard, Settings, FileText, Monitor, ScrollText,
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data, loading } = useSession();
  const [schoolName, setSchoolName] = useState("Sekolah");

  useEffect(() => {
    let alive = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const name = j?.data?.school_name || j?.school_name;
        if (alive && typeof name === "string" && name.trim()) setSchoolName(name.trim());
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const items = data ? data.nav : NAV_ITEMS; // fail-open ke daftar penuh bila sesi belum siap
  const meta = data?.meta;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 glass-button p-3 rounded-xl"
        aria-label="Menu"
      >
        {isOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 glass border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          <div className="mb-7 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 shadow-[0_10px_35px_rgba(2,8,23,0.18)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/15 grid place-items-center flex-shrink-0">
                <img src="/kastriva-absensi-mark.svg" alt="Kastriva Absensi" className="w-10 h-10 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold tracking-[-0.02em] text-white leading-none whitespace-nowrap">
                  Kastriva <span className="text-sky-300">Absensi</span>
                </div>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">QR Attendance System</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[11px] text-slate-300 font-semibold leading-snug truncate" title={schoolName}>{schoolName}</p>
              {meta ? (
                <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.tone}`}>
                  {meta.label}{meta.readOnly ? " · baca-saja" : ""}
                </span>
              ) : (
                <p className="mt-1 text-[10px] text-indigo-300">Admin Dashboard</p>
              )}
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
            {loading && !data
              ? Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton h-11 w-full rounded-xl" />)
              : items.map((item) => {
                  const Icon = ICONS[item.icon] || LayoutDashboard;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition ${
                        isActive
                          ? "bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 shadow-lg shadow-indigo-500/10"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
          </nav>

          <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
            <div className="px-1 leading-tight"><p className="text-[10px] text-slate-500">Powered by <span className="text-slate-400 font-semibold">Kastriva Absensi</span></p><p className="text-[9px] text-slate-600 mt-0.5">QR Attendance · PWA</p></div>
          </div>
        </div>
      </aside>
    </>
  );
}
