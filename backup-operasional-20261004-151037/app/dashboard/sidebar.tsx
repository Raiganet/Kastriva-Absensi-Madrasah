"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, GraduationCap, ClipboardList,
  BarChart3, CreditCard, Settings, Menu, X, FileText, Monitor, ScrollText,
} from "lucide-react";
import { useState } from "react";
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
          <div className="flex items-center gap-3 mb-8 px-1">
            <img src="/kastriva-absensi-mark.svg" alt="Kastriva" className="w-11 h-11 rounded-xl object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-bold text-[12px] text-white leading-tight">Kastriva-<br/><span className="text-sky-300">Absensi</span></h1>
              {meta ? (
                <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.tone}`}>
                  {meta.label}{meta.readOnly ? " · baca‑saja" : ""}
                </span>
              ) : (
                <p className="text-[11px] text-indigo-300 truncate">Admin Dashboard</p>
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
            <p className="text-[11px] text-slate-500 px-1">Kastriva-Absensi · QR Attendance PWA</p>
          </div>
        </div>
      </aside>
    </>
  );
}
