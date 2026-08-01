"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setMsg({ ok: false, text: data.error || "Gagal." }); return; }
      setMsg({ ok: true, text: data.message || "Berhasil." });
      if (mode === "login") router.push(params.get("from") || "/dashboard");
    } catch {
      setMsg({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="fixed top-4 right-4 z-30"><ThemeToggle /></div>
      <div className="glass-card w-full max-w-md p-7 sm:p-9 animate-fadeIn">
        <div className="flex justify-center mb-5">
          <img src="/android-chrome-192x192.png" alt="Kastriva Absensi" className="w-20 h-20 rounded-2xl object-contain drop-shadow-2xl" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 text-center bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          {mode === "login" ? "Selamat Datang" : "Buat Akun"}
        </h1>
        <p className="text-sm text-slate-400 mb-7 text-center">
  Kastriva Absensi Madrasah · Sistem Absensi Digital
</p>

        <form onSubmit={submit} className="space-y-5">
          {mode === "register" && (
            <div className="space-y-2">
              <label className="block text-sm text-slate-300 font-medium">Nama Lengkap</label>
              <input value={form.name} onChange={set("name")} required className="glass-input w-full px-4 py-3 text-base" placeholder="Masukkan nama lengkap" />
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm text-slate-300 font-medium">Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
              <input type="email" value={form.email} onChange={set("email")} required className="glass-input w-full pl-11 pr-4 py-3 text-base" placeholder="email@sekolah.sch.id" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-slate-300 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
              <input type={show ? "text" : "password"} value={form.password} onChange={set("password")} required className="glass-input w-full pl-11 pr-12 py-3 text-base" placeholder="Minimal 8 karakter" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === "register" && (
              <p className="text-xs text-slate-500">Min. 8 karakter: huruf besar, huruf kecil, angka, simbol.</p>
            )}
          </div>

          {msg && (
            <div className={`text-sm rounded-xl px-4 py-3 ${msg.ok ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "bg-rose-500/20 text-rose-300 border border-rose-400/30"}`}>
              {msg.text}
            </div>
          )}

          <button disabled={busy} className="glass-button w-full py-3.5 text-base font-bold disabled:opacity-50">
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setMsg(null); }} className="text-sm text-slate-400 hover:text-white transition">
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
          {mode === "login" && (
            <a href="/forgot-password" className="text-sm text-indigo-300 hover:text-indigo-200 transition">Lupa password?</a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
