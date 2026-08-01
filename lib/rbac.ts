// =====================================================================
//  KASTRIVA · RBAC  —  multi-sekolah (TK/SD/SMP/SMA)
// =====================================================================

export type Role = "super_admin" | "admin" | "kepsek" | "wali_kelas";
export const ROLES: readonly Role[] = ["super_admin", "admin", "kepsek", "wali_kelas"];

export type School = "RA" | "MI" | "MTS" | "MA" | "all";
export const SCHOOLS: readonly School[] = ["RA", "MI", "MTS", "MA"];

export type Action =
  | "view_dashboard"
  | "view_students"   | "manage_students"
  | "view_users"      | "manage_users"
  | "view_attendance"
  | "view_statistics"
  | "print_cards"
  | "view_settings"   | "manage_settings"
  | "manage_self";

export const ALL_ACTIONS: readonly Action[] = [
  "view_dashboard",
  "view_students", "manage_students",
  "view_users", "manage_users",
  "view_attendance",
  "view_statistics",
  "print_cards",
  "view_settings", "manage_settings",
  "manage_self",
];

const FULL: readonly Action[] = ALL_ACTIONS;
const READ_ONLY_SCOPE: readonly Action[] = [
  "view_dashboard", "view_students", "view_attendance",
  "view_statistics", "print_cards", "view_settings", "manage_self",
];
const WALI_SCOPE: readonly Action[] = [
  "view_dashboard", "view_students", "view_attendance",
  "view_statistics", "print_cards", "manage_self",
];

export const POLICY: Record<Role, readonly Action[]> = {
  super_admin: FULL,
  admin: FULL,
  kepsek: READ_ONLY_SCOPE,
  wali_kelas: WALI_SCOPE,
};

export interface RoleMeta {
  label: string;
  short: string;
  description: string;
  icon: string;
  tone: string;
  accent: string;
  readOnly: boolean;
  level: number;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  super_admin: {
    label: "Super Admin", short: "SA", icon: "ShieldCheck",
    description: "Akses penuh lintas sekolah (TK/SD/SMP/SMA); kelola admin per sekolah.",
    tone: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/30",
    accent: "#d946ef", readOnly: false, level: 4,
  },
  admin: {
    label: "Administrator", short: "AD", icon: "Shield",
    description: "Akses penuh untuk satu sekolah: kelola siswa, pengguna, pengaturan, dan laporan.",
    tone: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
    accent: "#6366f1", readOnly: false, level: 3,
  },
  kepsek: {
    label: "Kepala Sekolah", short: "KS", icon: "Eye",
    description: "Pantau seluruh kehadiran & laporan sekolahnya; tidak dapat mengubah data.",
    tone: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    accent: "#10b981", readOnly: true, level: 2,
  },
  wali_kelas: {
    label: "Wali Kelas", short: "WK", icon: "Users",
    description: "Melihat & memantau kelas binaannya saja di sekolahnya.",
    tone: "bg-sky-500/15 text-sky-300 border-sky-400/30",
    accent: "#0ea5e9", readOnly: true, level: 1,
  },
};

// ---- Cakupan data per peran -----------------------------------------
export type DataScope = "all" | "school" | "class";
export const SCOPE: Record<Role, DataScope> = {
  super_admin: "all",
  admin: "school",
  kepsek: "school",
  wali_kelas: "class",
};
export function scopeForRole(role: Role | string | undefined): DataScope {
  return SCOPE[normalizeRole(role)];
}

export function normalizeRole(raw: unknown): Role {
  const r = (raw ?? "").toString().trim().toLowerCase();
  if (r === "super_admin") return "super_admin";
  if (r === "admin" || r === "user" || r === "") return "admin";
  if (r === "kepsek") return "kepsek";
  if (r === "wali_kelas") return "wali_kelas";
  return "admin";
}

export function normalizeSchool(raw: unknown): School {
  const s = (raw ?? "").toString().trim().toUpperCase();
  if (s === "TK" || s === "SD" || s === "SMP" || s === "SMA") return s;
  return "all";
}

export function can(role: Role | string | undefined, action: Action): boolean {
  return POLICY[normalizeRole(role)].includes(action);
}
export function canAny(role: Role | string | undefined, actions: readonly Action[]): boolean {
  return actions.some((a) => can(role, a));
}
export function canAll(role: Role | string | undefined, actions: readonly Action[]): boolean {
  return actions.every((a) => can(role, a));
}
export function isAtLeast(role: Role | string | undefined, min: Role): boolean {
  return ROLE_META[normalizeRole(role)].level >= ROLE_META[min].level;
}
export function isReadOnly(role: Role | string | undefined): boolean {
  return ROLE_META[normalizeRole(role)].readOnly;
}
export function roleMeta(role: Role | string | undefined): RoleMeta {
  return ROLE_META[normalizeRole(role)];
}
export function assertCan(role: Role | string | undefined, action: Action): void {
  if (!can(role, action)) {
    const e = new Error(`Akses ditolak: peran '${normalizeRole(role)}' tidak memiliki '${action}'.`);
    (e as Error & { status?: number }).status = 403;
    throw e;
  }
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  gate: Action;
}
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard",            label: "Dashboard",          icon: "LayoutDashboard", gate: "view_dashboard" },
  { href: "/dashboard/users",      label: "Users Sheet",        icon: "Users",           gate: "view_users" },
  { href: "/dashboard/students",   label: "Siswa (CRUD)",       icon: "GraduationCap",   gate: "view_students" },
  { href: "/dashboard/attendance", label: "Kehadiran",          icon: "ClipboardList",   gate: "view_attendance" },
  { href: "/dashboard/statistics", label: "Statistik Siswa",    icon: "BarChart3",       gate: "view_statistics" },
  { href: "/dashboard/reports",    label: "Laporan & Rekap",    icon: "FileText",        gate: "print_cards" },
  { href: "/dashboard/cards",      label: "Cetak Kartu Siswa",  icon: "CreditCard",      gate: "print_cards" },
  { href: "/dashboard/settings",   label: "Pengaturan Sekolah", icon: "Settings",        gate: "view_settings" },
];
export function visibleNav(role: Role | string | undefined): NavItem[] {
  return NAV_ITEMS.filter((i) => can(role, i.gate));
}

export interface RoleOption { value: Role; label: string; description: string; availableNow: boolean; }
export const ROLE_OPTIONS: readonly RoleOption[] = [
  { value: "admin",      label: ROLE_META.admin.label,      description: ROLE_META.admin.description,      availableNow: true },
  { value: "kepsek",     label: ROLE_META.kepsek.label,     description: ROLE_META.kepsek.description,     availableNow: true },
  { value: "wali_kelas", label: ROLE_META.wali_kelas.label, description: ROLE_META.wali_kelas.description, availableNow: true },
  { value: "super_admin",label: ROLE_META.super_admin.label,description: ROLE_META.super_admin.description,availableNow: false },
];

// ---- Proteksi akuntabilitas -----------------------------------------
export function canManageUser(
  actorRole: Role | string | undefined,
  targetRole: Role | string | undefined,
  opts: { isSelf?: boolean; superAdminCount?: number; op?: "edit" | "delete" } = {}
): { ok: boolean; reason?: string } {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  const op = opts.op || "edit";

  if (actor === "kepsek" || actor === "wali_kelas") {
    return { ok: false, reason: "Peran Anda tidak memiliki wewenang mengelola pengguna." };
  }
  if (op === "delete" && opts.isSelf) {
    return { ok: false, reason: "Anda tidak dapat menghapus akun Anda sendiri." };
  }
  if (actor === "admin" && target === "super_admin") {
    return { ok: false, reason: "Administrator tidak dapat mengubah atau menghapus Super Admin." };
  }
  if (target === "super_admin" && (opts.superAdminCount ?? 0) <= 1) {
    return {
      ok: false,
      reason: op === "delete"
        ? "Super Admin terakhir tidak dapat dihapus."
        : "Peran Super Admin terakhir tidak dapat diubah.",
    };
  }
  return { ok: true };
}
