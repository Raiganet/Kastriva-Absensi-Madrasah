"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Edit, Trash2, X, Mail, Lock, Search, Loader2,
  Users as UsersIcon, GraduationCap, Settings as SettingsIcon,
  BarChart3, KeyRound, LayoutDashboard, ShieldCheck, Shield, Eye,
  Check, X as XIcon, Info, ChevronDown,
} from "lucide-react";
import { useToast, useConfirm } from "@/components/ui";
import { useSession, clearSessionCache } from "@/components/session";
import {
  can, isReadOnly, ROLE_META, ROLE_OPTIONS, normalizeRole, SCHOOLS,
} from "@/lib/rbac";
import type { Role, Action } from "@/lib/rbac";

interface UserRec { UserID: string; Email: string; Role: string; CreatedAt: string; School?: string; Classes?: string; }

const ROLE_ICON: Record<string, typeof Shield> = {
  ShieldCheck, Shield, Eye, Users: UsersIcon,
};

const CAPS: { key: string; label: string; Icon: typeof Shield; actions: Action[] }[] = [
  { key: "dash",  label: "Dasbor",   Icon: LayoutDashboard, actions: ["view_dashboard"] },
  { key: "siswa", label: "Siswa",    Icon: GraduationCap,   actions: ["view_students", "manage_students"] },
  { key: "user",  label: "Pengguna", Icon: UsersIcon,       actions: ["view_users", "manage_users"] },
  { key: "moni",  label: "Laporan",  Icon: BarChart3,       actions: ["view_attendance", "view_statistics", "print_cards"] },
  { key: "set",   label: "Setelan",  Icon: SettingsIcon,    actions: ["view_settings", "manage_settings"] },
  { key: "self",  label: "Sandi",    Icon: KeyRound,        actions: ["manage_self"] },
];
type CellState = "full" | "view" | "none";
function capState(role: string, actions: Action[]): CellState {
  if (actions.every((a) => can(role, a))) return "full";
  if (actions.some((a) => can(role, a))) return "view";
  return "none";
}

const GRID = "minmax(150px,1.5fr) repeat(6, minmax(74px,1fr))";

export default function UsersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRec | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ Email: "", Password: "", Role: "admin", Classes: "", School: "all" });
  const [q, setQ] = useState("");
  const [fRole, setFRole] = useState("");

  const isWaliTarget = normalizeRole(form.Role) === "wali_kelas";
  const isSuperAdminTarget = normalizeRole(form.Role) === "super_admin";
  const actorRole = session?.role || "admin";
  const actorSchool = session?.school || "all";

  const availableSchools = useMemo(() => {
    if (actorRole === "super_admin") return ["all", ...SCHOOLS];
    return [actorSchool];
  }, [actorRole, actorSchool]);

  const load = async () => {
    try { setUsers(await (await fetch("/api/users")).json()); }
    catch { toast.error("Gagal memuat daftar user."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return users.filter((u) =>
      (!fRole || normalizeRole(u.Role) === (fRole as Role)) &&
      (!ql || u.Email.toLowerCase().includes(ql))
    );
  }, [users, q, fRole]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = editing ? { ...form, UserID: editing.UserID } : form;
      const res = await fetch("/api/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal menyimpan user."); return; }
      
      toast.success(
        editing ? "Akun pengguna diperbarui." : "Akun pengguna ditambahkan.",
        editing ? "Diperbarui" : "Ditambahkan"
      );
      
      // ✅ AUTO REFRESH SESSION & DATA
      clearSessionCache();
      await load();
      closeForm();
      
    } catch { toast.error("Tidak dapat terhubung ke server."); }
    finally { setBusy(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      Email: "", Password: "", Role: "admin", Classes: "",
      School: actorRole === "super_admin" ? "all" : actorSchool,
    });
    setShowForm(true);
  }
  
  function openEdit(u: UserRec) {
    setEditing(u);
    setForm({
      Email: u.Email, Password: "", Role: normalizeRole(u.Role),
      Classes: u.Classes || "", School: u.School || "all",
    });
    setShowForm(true);
  }
  
  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm({ Email: "", Password: "", Role: "admin", Classes: "", School: "all" });
  }

  async function remove(u: UserRec) {
    const ok = await confirm({
      tone: "danger",
      title: "Hapus akun pengguna?",
      message: `Akun ${u.Email} (${ROLE_META[normalizeRole(u.Role)].label}) akan dihapus permanen.`,
    });
    if (!ok) return;
    
    try {
      const res = await fetch(`/api/users?id=${u.UserID}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal menghapus user."); return; }
      
      toast.success("Akun pengguna dihapus.", "Dihapus");
      clearSessionCache();
      await load();
      
    } catch { toast.error("Tidak dapat terhubung ke server."); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-300">Memuat user…</div>;

  const chosenMeta = ROLE_META[normalizeRole(form.Role)];

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-300/80 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Akses &amp; Peran
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Pengguna &amp; Wewenang</h1>
          <p className="text-sm text-slate-400 mt-1">
            {users.length} akun · {ROLE_OPTIONS.filter((o) => o.availableNow).length} peran dapat ditugaskan sekarang
          </p>
        </div>
        <button onClick={openAdd} className="glass-button px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </header>

      {/* ===== MATRIKS WEWENANG ===== */}
      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-300" /> Matriks Wewenang Per Peran
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Apa yang boleh dilakukan tiap peran. Wali kelas dibatasi pada kelas binaannya.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto mt-4 -mx-1 px-1">
          <div className="min-w-[680px]">
            <div className="grid items-end gap-2 pb-2 mb-1 border-b border-white/10" style={{ gridTemplateColumns: GRID }}>
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-slate-500">Peran</span>
              {CAPS.map((c) => (
                <div key={c.key} className="flex flex-col items-center gap-1 text-center">
                  <c.Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-400 leading-tight">{c.label}</span>
                </div>
              ))}
            </div>

            {(["super_admin", "admin", "kepsek", "wali_kelas"] as Role[]).map((role) => {
              const m = ROLE_META[role];
              const Icon = ROLE_ICON[m.icon] || Shield;
              return (
                <div key={role} className="grid items-center gap-2 py-3 rounded-xl px-1 -mx-1 transition-colors hover:bg-white/[0.04]" style={{ gridTemplateColumns: GRID }}>
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 border" style={{ background: m.accent + "1f", borderColor: m.accent + "55", color: m.accent }}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate leading-tight">{m.label}</p>
                      {m.readOnly && <p className="text-[9px] font-semibold tracking-wide uppercase text-amber-300/90">baca‑saja</p>}
                    </div>
                  </div>
                  {CAPS.map((c) => {
                    const st = capState(role, c.actions);
                    return (
                      <div key={c.key} className="flex justify-center">
                        {st === "full" && (
                          <span title="Akses penuh" className="w-7 h-7 rounded-lg grid place-items-center bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                        {st === "view" && (
                          <span title="Hanya melihat" className="w-7 h-7 rounded-lg grid place-items-center bg-amber-500/15 text-amber-300 border border-amber-400/30">
                            <Eye className="w-4 h-4" />
                          </span>
                        )}
                        {st === "none" && (
                          <span title="Tidak ada akses" className="w-7 h-7 rounded-lg grid place-items-center bg-white/[0.03] text-slate-600 border border-white/10">
                            <XIcon className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="col-span-full flex items-start gap-2.5 pr-2">
                    <span className="w-8 flex-shrink-0 flex justify-start" aria-hidden="true">
                      <Info className="w-3.5 h-3.5 mt-0.5 text-slate-500" />
                    </span>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md grid place-items-center bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              <Check className="w-3 h-3" />
            </span> penuh
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md grid place-items-center bg-amber-500/15 text-amber-300 border border-amber-400/30">
              <Eye className="w-3 h-3" />
            </span> hanya melihat
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md grid place-items-center bg-white/[0.03] text-slate-600 border border-white/10">
              <XIcon className="w-3 h-3" />
            </span> tidak ada
          </span>
        </div>
      </section>

      {/* ===== FILTER ===== */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari email…" className="w-full pl-9 pr-3 py-2.5 text-sm" />
        </div>
        <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="px-3 py-2.5 text-sm sm:max-w-[200px]">
          <option value="">Semua Peran</option>
          {(["super_admin", "admin", "kepsek", "wali_kelas"] as Role[]).map((r) => (
            <option key={r} value={r}>{ROLE_META[r].label}</option>
          ))}
        </select>
      </div>

      {/* ===== TABEL ===== */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] sm:text-xs">
                <th className="p-3">Email</th>
                <th className="p-3">Peran</th>
                <th className="p-3 hidden lg:table-cell">Sekolah</th>
                <th className="p-3 hidden md:table-cell">Kelas Binaan</th>
                <th className="p-3 hidden sm:table-cell">Dibuat</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((u) => {
                const m = ROLE_META[normalizeRole(u.Role)];
                const Icon = ROLE_ICON[m.icon] || Shield;
                const cls = (u.Classes || "").toString();
                const school = u.School || "all";
                return (
                  <tr key={u.UserID}>
                    <td className="p-3"><span className="font-mono text-indigo-300 break-all">{u.Email}</span></td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${m.tone}`}>
                        <Icon className="w-3 h-3" /> {m.label}
                        {m.readOnly && <span className="opacity-70">· baca‑saja</span>}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {school === "all"
                        ? <span className="text-fuchsia-300 text-xs font-semibold">Semua Sekolah</span>
                        : <span className="text-sky-300 text-xs font-semibold">{school}</span>}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {normalizeRole(u.Role) === "wali_kelas"
                        ? (cls ? <span className="text-sky-300 text-xs">{cls}</span> : <span className="text-amber-300/80 text-xs">belum diisi</span>)
                        : <span className="text-slate-500 text-xs">—</span>}
                    </td>
                    <td className="p-3 text-slate-400 text-xs hidden sm:table-cell whitespace-nowrap">
                      {u.CreatedAt ? new Date(u.CreatedAt).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(u)} className="text-amber-300 hover:text-amber-200 p-1.5 rounded-lg hover:bg-white/10 mr-1" aria-label="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(u)} className="text-rose-300 hover:text-rose-200 p-1.5 rounded-lg hover:bg-rose-500/10" aria-label="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500 text-sm">
                  {users.length === 0 ? "Belum ada user terdaftar." : "Tidak ada user sesuai filter."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeForm}>
          <div className="modal-panel glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Akun" : "Tambah Akun"}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={form.Email}
                    onChange={(e) => setForm({ ...form, Email: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    autoComplete="off"
                    required
                    className="glass-input w-full pl-10 pr-3 py-2.5 text-sm"
                    placeholder="user@sekolah.sch.id"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                  {editing ? "Password baru (kosongkan bila tidak diubah)" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={form.Password}
                    onChange={(e) => setForm({ ...form, Password: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    autoComplete="new-password"
                    required={!editing}
                    className="glass-input w-full pl-10 pr-3 py-2.5 text-sm"
                    placeholder={editing ? "••••••••" : "Minimal 8 karakter"}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Peran</label>
                <RoleSelect value={form.Role} onChange={(v) => setForm({ ...form, Role: v })} />
                <div className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] border ${isReadOnly(form.Role) ? "bg-amber-500/10 border-amber-400/25 text-amber-200" : "bg-white/[0.03] border-white/10 text-slate-400"}`}>
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{chosenMeta.description}{isReadOnly(form.Role) ? " Perubahan data tidak tersedia untuk peran ini." : ""}</span>
                </div>
              </div>

              {!isSuperAdminTarget && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Sekolah <span className="text-rose-300">*</span></label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <select
                      value={form.School}
                      onChange={(e) => setForm({ ...form, School: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-sm glass-input"
                    >
                      {availableSchools.map((s) => (
                        <option key={s} value={s}>{s === "all" ? "Semua Sekolah" : s}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    {actorRole === "super_admin" ? "Pilih sekolah yang akan dikelola user ini." : `Anda hanya dapat membuat akun untuk sekolah ${actorSchool}.`}
                  </p>
                </div>
              )}

              {isWaliTarget && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Kelas Binaan <span className="text-rose-300">*</span></label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <textarea
                      value={form.Classes}
                      onChange={(e) => setForm({ ...form, Classes: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      rows={2}
                      className="glass-input w-full pl-10 pr-3 py-2.5 text-sm"
                      placeholder="XI IPA 1, XI IPA 2"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">Pisahkan beberapa kelas dengan koma.</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={busy} className="glass-button flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Perbarui" : "Simpan"}
                </button>
                <button type="button" onClick={closeForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/15 hover:bg-white/10">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Pemilih peran bertema ===== */
const DISABLED_REASON: Partial<Record<Role, string>> = {
  super_admin: "Hanya melalui penyiapan awal sistem (seed).",
};

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next && btnRef.current) setDropUp(btnRef.current.getBoundingClientRect().bottom > window.innerHeight * 0.6);
      return next;
    });
  };

  const current = normalizeRole(value);
  const curMeta = ROLE_META[current];
  const CurIcon = ROLE_ICON[curMeta.icon] || Shield;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass-input w-full pl-2.5 pr-3 py-2 text-sm flex items-center gap-2.5 text-left transition hover:border-indigo-400/40"
      >
        <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 border" style={{ background: curMeta.accent + "1f", borderColor: curMeta.accent + "55", color: curMeta.accent }}>
          <CurIcon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0 font-semibold truncate" style={{ color: "var(--field-color)" }}>{curMeta.label}</span>
        {curMeta.readOnly && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-300 flex-shrink-0">baca‑saja</span>}
        <ChevronDown className={"w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div
          role="listbox"
          className={"modal-panel absolute z-50 w-full !rounded-xl p-1.5 max-h-72 overflow-y-auto shadow-2xl " + (dropUp ? "bottom-full mb-2" : "top-full mt-2")}
          style={{
            background: "rgba(15,23,42,0.94)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {ROLE_OPTIONS.map((o) => {
            const m = ROLE_META[o.value];
            const Icon = ROLE_ICON[m.icon] || Shield;
            const selected = current === o.value;
            const disabled = !o.availableNow;
            return (
              <button
                type="button"
                key={o.value}
                role="option"
                aria-selected={selected}
                disabled={disabled}
                onClick={() => { if (disabled) return; onChange(o.value); setOpen(false); }}
                className={"w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg transition " + (disabled ? "opacity-45 cursor-not-allowed" : selected ? "bg-indigo-500/15" : "hover:bg-white/10")}
              >
                <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 border mt-0.5" style={{ background: m.accent + "1f", borderColor: m.accent + "55", color: m.accent }}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold leading-tight" style={{ color: "var(--field-color)" }}>{m.label}</span>
                    {m.readOnly && <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30">baca‑saja</span>}
                    {!o.availableNow && <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-white/10">segera</span>}
                  </span>
                  <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">{disabled ? (DISABLED_REASON[o.value] || m.description) : m.description}</span>
                </span>
                {selected && <Check className="w-4 h-4 text-emerald-300 mt-1 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
