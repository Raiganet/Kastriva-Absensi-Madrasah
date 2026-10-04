import Link from "next/link";
import { Home, ArrowLeft, Compass } from "lucide-react";
import { Reveal } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Reveal className="w-full max-w-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="animate-floaty w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/30">
            <img src="/kastriva-absensi-mark.svg" alt="Kastriva" className="w-full h-full object-contain" />
          </div>
        </div>
        <p className="font-display text-7xl sm:text-8xl font-extrabold text-white/90 tabular leading-none">404</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">Halaman tidak ditemukan</h1>
        <p className="text-sm text-slate-400 mt-3 max-w-sm mx-auto leading-relaxed">
          Rute yang Anda tuju tidak ada atau sudah dipindahkan. Mungkin salah ketik, atau halamannya sudah berganti alamat.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/dashboard" className="glass-button px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Ke Dashboard
          </Link>
          <Link href="/login" className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-200 border border-white/15 hover:bg-white/10 transition flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Halaman Masuk
          </Link>
        </div>
        <p className="text-[11px] text-slate-600 mt-8 flex items-center justify-center gap-1.5">
          <Compass className="w-3.5 h-3.5" /> Kastriva Absensi
        </p>
      </Reveal>
    </div>
  );
}
