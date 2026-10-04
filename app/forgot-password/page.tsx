"use client";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

type Step = "email" | "otp" | "success";

function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/forgotPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ ok: false, text: data.error || "Gagal mengirim OTP." });
        return;
      }
      setMsg({ ok: true, text: "Kode OTP dikirim ke email Anda (berlaku 5 menit)." });
      setStep("otp");
    } catch {
      setMsg({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const verifyRes = await fetch("/api/auth/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.ok) {
        setMsg({ ok: false, text: verifyData.error || "OTP tidak valid." });
        setBusy(false);
        return;
      }
      const resetRes = await fetch("/api/auth/resetPassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok || !resetData.ok) {
        setMsg({ ok: false, text: resetData.error || "Gagal reset password." });
        setBusy(false);
        return;
      }
      setMsg({ ok: true, text: "Password berhasil direset! Silakan login." });
      setStep("success");
    } catch {
      setMsg({ ok: false, text: "Tidak dapat terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-center mb-3">
          <img src="/kastriva-absensi-mark.svg" alt="Kastriva Absensi" className="w-16 h-16 rounded-2xl object-contain" />
        </div>
        <h1 className="text-xl font-bold mb-1 text-center">
          {step === "email" ? "Lupa Password" : step === "otp" ? "Masukkan Kode OTP" : "Berhasil!"}
        </h1>
        <p className="text-xs text-slate-400 mb-5 text-center">
          {step === "email"
            ? "Masukkan email untuk menerima kode OTP"
            : step === "otp"
            ? "Kode OTP 6 digit telah dikirim ke email Anda"
            : "Password Anda telah berhasil direset"}
        </p>

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="email@sekolah.sch.id"
                />
              </div>
            </div>
            {msg && (
              <div className={`text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${msg.ok ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"}`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{msg.text}</span>
              </div>
            )}
            <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2 font-semibold">
              {busy ? "Mengirim..." : "Kirim Kode OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyAndReset} className="space-y-3 text-sm">
            <div>
              <label className="block text-slate-400 mb-1">Kode OTP (6 digit)</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-white text-center text-2xl tracking-[0.5em] font-mono focus:border-indigo-500 focus:outline-none"
                  placeholder="000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Password Baru</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-16 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Min. 8 karakter, huruf besar, angka, simbol"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-white">
                  {showPw ? "sembunyi" : "lihat"}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Min. 8 karakter: huruf besar, huruf kecil, angka, simbol.</p>
            </div>
            {msg && (
              <div className={`text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${msg.ok ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300"}`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{msg.text}</span>
              </div>
            )}
            <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2 font-semibold">
              {busy ? "Memproses..." : "Reset Password"}
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm text-slate-300">Password Anda telah berhasil direset.</p>
            <button onClick={() => router.push("/login")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 font-semibold">
              Kembali ke Login
            </button>
          </div>
        )}

        {step !== "success" && (
          <button onClick={() => router.push("/login")} className="mt-4 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto">
            <ArrowLeft className="w-3 h-3" /> Kembali ke Login
          </button>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
