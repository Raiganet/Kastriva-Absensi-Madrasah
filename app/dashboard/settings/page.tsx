"use client";
import { useEffect, useRef, useState } from "react";
import { Save, Upload, Trash2, Palette, Building2, Globe, UserCog, Sparkles, Loader2, Clock3, Radio } from "lucide-react";
import { useToast } from "@/components/ui";

const THEMES = [
  { id: "navy", name: "Navy Royal", front: "radial-gradient(120% 80% at 50% -10%, #16407e 0%, #081d40 100%)", accent: "#f5c542" },
  { id: "emerald", name: "Emerald", front: "radial-gradient(120% 80% at 50% -10%, #0f5132 0%, #07271a 100%)", accent: "#fbbf24" },
  { id: "maroon", name: "Maroon", front: "radial-gradient(120% 80% at 50% -10%, #6b1f2a 0%, #320c13 100%)", accent: "#f4c06a" },
  { id: "slate", name: "Slate Steel", front: "radial-gradient(120% 80% at 50% -10%, #334155 0%, #0f172a 100%)", accent: "#e2e8f0" },
  { id: "teal", name: "Teal Ocean", front: "radial-gradient(120% 80% at 50% -10%, #0e4f57 0%, #06262a 100%)", accent: "#5eead4" },
  { id: "cocoa", name: "Cocoa", front: "radial-gradient(120% 80% at 50% -10%, #4a2c1a 0%, #21130b 100%)", accent: "#e8b06a" },
  { id: "whiteRed", name: "Putih-Merah", front: "linear-gradient(180deg, #991b1b 0%, #dc2626 18%, #fff 27%, #fff 72%, #dc2626 82%, #991b1b 100%)", accent: "#b91c1c" },
  { id: "whiteBlue", name: "Putih-Biru", front: "linear-gradient(180deg, #1e3a8a 0%, #2563eb 18%, #fff 27%, #fff 72%, #2563eb 82%, #1e3a8a 100%)", accent: "#1d4ed8" },
  { id: "whiteGrey", name: "Putih-Abu", front: "linear-gradient(180deg, #334155 0%, #64748b 18%, #fff 27%, #fff 72%, #64748b 82%, #334155 100%)", accent: "#475569" },
];
function getTheme(id: string) {
  const t = THEMES.find((x) => x.id === id);
  return t || THEMES[0];
}

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        setSettings(data);
        if (data.logo_url) setLogoPreview(data.logo_url);
      } catch {
        toast.error("Gagal memuat pengaturan.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const body = { ...settings, logo_url: pendingLogo !== null ? pendingLogo : settings.logo_url || "" };
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { toast.error("Gagal menyimpan pengaturan."); return; }
      toast.success("Identitas, tema, dan logo sekolah tersimpan.", "Tersimpan");
      setPendingLogo(null);
      const fresh = await (await fetch("/api/settings")).json();
      setSettings(fresh);
      setLogoPreview(fresh.logo_url || null);
    } catch {
      toast.error("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { toast.warning("Ukuran logo maksimal 4MB."); return; }
    const r = new FileReader();
    r.onload = (ev) => {
      const d = ev.target?.result as string;
      setPendingLogo(d);
      setLogoPreview(d);
      toast.info("Logo baru dipilih — jangan lupa Simpan.", "Pratinjau");
    };
    r.readAsDataURL(f);
  }
  function removeLogo() {
    setPendingLogo("");
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-300">Memuat pengaturan…</div>;

  const theme = getTheme(settings.card_bg_preset || "navy");
  const logo = logoPreview;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-300/80 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Konfigurasi</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Pengaturan Sekolah</h1>
        <p className="text-sm text-slate-400 mt-1">Identitas, tema kartu, dan logo — pratinjau memperbarui diri saat Anda mengetik.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* kolom form */}
        <div className="lg:col-span-2 space-y-6">
          {/* identitas */}
          <section className="glass-card p-5 sm:p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-indigo-300" /> Identitas Sekolah</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nama Sekolah" icon={<Building2 className="w-4 h-4" />}>
                <input value={settings.school_name || ""} onChange={(e) => setSettings({ ...settings, school_name: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="MA IMTAQ" />
              </Field>
              <Field label="Nama Kepala Sekolah" icon={<UserCog className="w-4 h-4" />}>
                <input value={settings.principal_name || ""} onChange={(e) => setSettings({ ...settings, principal_name: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="Adem Wahim, S.HI, S.Pd.I" />
              </Field>
              <Field label="Tagline / Motto" icon={<Sparkles className="w-4 h-4" />} full>
                <input value={settings.school_tagline || ""} onChange={(e) => setSettings({ ...settings, school_tagline: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="Selalu di depan membangun bangsa" />
              </Field>
              <Field label="Website Sekolah" icon={<Globe className="w-4 h-4" />} full>
                <input value={settings.school_website || ""} onChange={(e) => setSettings({ ...settings, school_website: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="https://ma-imtaq.sch.id" />
              </Field>
            </div>
          </section>


          <section className="glass-card p-5 sm:p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1"><Clock3 className="w-4 h-4 text-cyan-300" /> Jam & Otomasi Absensi</h2>
            <p className="text-[11px] text-slate-500 mb-4">Dipakai mode scan otomatis untuk menentukan Masuk, Terlambat, dan Pulang.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Jam Masuk" icon={<Clock3 className="w-4 h-4" />}><input type="time" value={settings.school_start_time || "07:00"} onChange={(e)=>setSettings({...settings, school_start_time:e.target.value})} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></Field>
              <Field label="Batas Terlambat" icon={<Clock3 className="w-4 h-4" />}><input type="time" value={settings.late_after || "07:15"} onChange={(e)=>setSettings({...settings, late_after:e.target.value})} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></Field>
              <Field label="Jam Pulang" icon={<Clock3 className="w-4 h-4" />}><input type="time" value={settings.school_end_time || "14:00"} onChange={(e)=>setSettings({...settings, school_end_time:e.target.value})} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></Field>
              <Field label="Refresh Live Dashboard (detik)" icon={<Radio className="w-4 h-4" />} full><input type="number" min="10" max="60" value={settings.live_refresh_seconds || "15"} onChange={(e)=>setSettings({...settings, live_refresh_seconds:e.target.value})} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></Field>
            </div>
          </section>

          {/* tema */}
          <section className="glass-card p-5 sm:p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1"><Palette className="w-4 h-4 text-indigo-300" /> Latar Kartu Siswa</h2>
            <p className="text-[11px] text-slate-500 mb-4">Dipakai di halaman Cetak Kartu. Aktif: <span className="text-slate-200 font-semibold">{theme.name}</span></p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {THEMES.map((t) => {
                const active = (settings.card_bg_preset || "navy") === t.id;
                return (
                  <button key={t.id} onClick={() => setSettings({ ...settings, card_bg_preset: t.id })} title={t.name}
                    className={`relative h-14 rounded-xl overflow-hidden border-2 transition active:scale-95 hover:-translate-y-0.5 ${active ? "border-white shadow-lg shadow-indigo-500/20 scale-[1.03]" : "border-white/10 hover:border-white/25"}`}
                    style={{ background: t.front }}>
                    <span className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full" style={{ background: t.accent, boxShadow: "0 0 0 1.5px rgba(0,0,0,.45)" }} />
                    <span className="absolute bottom-1 left-1.5 text-[8px] font-bold text-white/90 drop-shadow">{t.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* logo */}
          <section className="glass-card p-5 sm:p-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><Upload className="w-4 h-4 text-indigo-300" /> Logo Sekolah</h2>
            <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-indigo-400/50 hover:bg-white/[0.03] transition">
              <Upload className="w-7 h-7 text-indigo-300 mx-auto mb-2" />
              <p className="text-sm text-slate-200 font-semibold">Klik untuk memilih logo</p>
              <p className="text-[11px] text-slate-500 mt-1">PNG transparan disarankan · maks 4MB</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogo} className="hidden" />
            </button>
            {logo && (
              <div className="mt-4 flex items-center gap-3 bg-black/20 border border-white/10 rounded-xl p-3">
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center p-1 flex-shrink-0">
                  <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{pendingLogo ? "Logo baru (belum disimpan)" : "Logo tersimpan"}</p>
                  <p className="text-[11px] text-slate-500">Tampil di kartu siswa & halaman masuk</p>
                </div>
                <button onClick={removeLogo} className="text-rose-300 hover:text-rose-200 text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            )}
          </section>

          <button onClick={handleSave} disabled={saving} className="glass-button w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Menyimpan…" : "Simpan Pengaturan"}
          </button>
        </div>

        {/* kolom pratinjau live */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 glass-card p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-400">Pratinjau</span>
              <span className="text-[10px] font-bold text-indigo-200 bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> LIVE</span>
            </div>
            <div className="h-16 rounded-xl relative overflow-hidden flex items-center px-3 gap-3" style={{ background: theme.front }}>
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ boxShadow: "0 0 0 1.5px " + theme.accent }}>
                {logo ? <img src={logo} className="w-full h-full object-contain" alt="" /> : <span className="text-[#0c2c5e] text-sm font-extrabold">🏫</span>}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-white uppercase tracking-wide truncate">{settings.school_name || "NAMA SEKOLAH"}</p>
                <p className="text-[7px] tracking-[0.12em] uppercase font-semibold truncate" style={{ color: theme.accent }}>{settings.school_tagline || "TAGLINE SEKOLAH"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <PreviewRow icon={<Building2 className="w-4 h-4 text-indigo-300" />} label="Sekolah" value={settings.school_name || "—"} />
              <PreviewRow icon={<UserCog className="w-4 h-4 text-indigo-300" />} label="Kepala Sekolah" value={settings.principal_name || "—"} />
              <PreviewRow icon={<Globe className="w-4 h-4 text-indigo-300" />} label="Website" value={settings.school_website || "—"} mono />
            </div>
            <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">Perubahan di sini hanya pratinjau. Tekan <span className="text-slate-300 font-semibold">Simpan Pengaturan</span> untuk menulis ke Spreadsheet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children, full }: { label: string; icon: React.ReactNode; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">{icon}</span>
        {children}
      </div>
    </div>
  );
}
function PreviewRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`text-slate-100 font-semibold truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
