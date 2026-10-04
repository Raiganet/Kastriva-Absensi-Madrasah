"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, X, Search, Loader2, GraduationCap, UserRound, Phone, MapPin, Hash, Info } from "lucide-react";
import { useToast, useConfirm } from "@/components/ui";
import { useSession } from "@/components/session";
import { Can } from "@/components/can";

interface StudentRec {
  Student_ID?: string; Student_Name?: string; Class_Name?: string;
  Academic_Year?: string; Parent_Name?: string; Parent_Phone?: string; Address?: string; Photo?: string;
}
const EMPTY: StudentRec = { Student_ID: "", Student_Name: "", Class_Name: "", Academic_Year: "", Parent_Name: "", Parent_Phone: "", Address: "", Photo: "" };

export default function StudentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: session } = useSession();
  const [students, setStudents] = useState<StudentRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StudentRec | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<StudentRec>(EMPTY);
  const [q, setQ] = useState("");
  const [fClass, setFClass] = useState("");
  const [limit, setLimit] = useState(50);

  const waliMode = session?.scope === "class";
  const classPool = waliMode ? session!.classes : undefined; // undefined = semua (admin/kepsek)

  const load = async () => {
    try { setStudents(await (await fetch("/api/students")).json()); }
    catch { toast.error("Gagal memuat data siswa."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { setLimit(50); }, [q, fClass]);

  const classOptions = useMemo(() => {
    const fromData = Array.from(new Set(students.map((s) => s.Class_Name || "-"))).sort();
    if (!classPool) return fromData;
    // wali kelas: hanya kelas binaan (gabung dengan yang ada di data, tetap dibatasi)
    const allowed = new Set(classPool);
    return fromData.filter((c) => allowed.has(c)).length ? fromData.filter((c) => allowed.has(c)) : [...classPool].sort();
  }, [students, classPool]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = students.filter((s) => {
      if (classPool && !classPool.includes(s.Class_Name || "-")) return false; // pagar kelas binaan
      if (fClass && (s.Class_Name || "-") !== fClass) return false;
      if (ql && !((s.Student_Name || "").toLowerCase().includes(ql) || (s.Student_ID || "").toLowerCase().includes(ql))) return false;
      return true;
    });
    list.sort((a, b) => (a.Class_Name || "").localeCompare(b.Class_Name || "") || (a.Student_Name || "").localeCompare(b.Student_Name || ""));
    return list;
  }, [students, q, fClass, classPool]);
  const visible = filtered.slice(0, limit);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Photo upload is not part of this form. Omitting it lets GAS preserve
      // an existing photo while keeping ordinary edits redirect-safe.
      const { Photo: _photo, ...studentPayload } = form;
      const res = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(studentPayload) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal menyimpan siswa."); return; }
      toast.success(editing ? "Data siswa diperbarui." : "Siswa baru ditambahkan.", editing ? "Diperbarui" : "Ditambahkan");
      closeForm(); load();
    } catch { toast.error("Tidak dapat terhubung ke server."); }
    finally { setBusy(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, Class_Name: waliMode && classPool && classPool.length === 1 ? classPool[0] : "" });
    setShowForm(true);
  }
  function openEdit(s: StudentRec) { setEditing(s); setForm({ ...EMPTY, ...s }); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY); }

  async function remove(s: StudentRec) {
    const ok = await confirm({ tone: "danger", title: "Hapus data siswa?", message: `Data ${s.Student_Name || ""} (${s.Student_ID || ""}) akan dihapus dari sheet Students. Tindakan ini tidak bisa dibatalkan.` });
    if (!ok) return;
    try {
      const res = await fetch(`/api/students?id=${s.Student_ID}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal menghapus siswa."); return; }
      toast.success("Data siswa dihapus.", "Dihapus");
      load();
    } catch { toast.error("Tidak dapat terhubung ke server."); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-300">Memuat data siswa…</div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-300/80 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Master Data</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Kelola Siswa</h1>
          <p className="text-sm text-slate-400 mt-1">{students.length} siswa · {classOptions.length} kelas</p>
        </div>
       <Can action="manage_students">
  <button onClick={openAdd} className="glass-button px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah Siswa</button>
</Can>
      </header>

      {waliMode && (
        <div className="glass-card p-4 flex items-start gap-3 border-sky-400/30">
          <Info className="w-4 h-4 text-sky-300 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-sky-200 font-semibold">Ruang lingkup wali kelas</p>
            <p className="text-slate-400 text-[13px] mt-0.5">
              Anda hanya melihat &amp; mengelola kelas binaan:{" "}
              <span className="text-slate-200 font-semibold">{(classPool || []).join(", ") || "—"}</span>.
              {!classPool || classPool.length === 0 ? " Minta admin mengisi “Kelas Binaan” pada akun Anda di Users Sheet." : ""}
            </p>
          </div>
        </div>
      )}

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIS…" className="w-full pl-9 pr-3 py-2.5 text-sm" />
        </div>
        <select value={fClass} onChange={(e) => setFClass(e.target.value)} className="px-3 py-2.5 text-sm sm:max-w-[180px]">
          <option value="">Semua Kelas</option>
          {classOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] sm:text-xs">
                <th className="p-3">NIS</th>
                <th className="p-3">Nama</th>
                <th className="p-3">Kelas</th>
                <th className="p-3 hidden lg:table-cell">Orang Tua</th>
                <th className="p-3 hidden md:table-cell">No. HP</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((s) => (
                <tr key={s.Student_ID}>
                  <td className="p-3 font-mono text-indigo-300 whitespace-nowrap">{s.Student_ID}</td>
                  <td className="p-3 font-semibold text-white whitespace-nowrap">{s.Student_Name}</td>
                  <td className="p-3 whitespace-nowrap">{s.Class_Name}</td>
                  <td className="p-3 hidden lg:table-cell">{s.Parent_Name || "—"}</td>
                  <td className="p-3 font-mono text-slate-400 hidden md:table-cell whitespace-nowrap">{s.Parent_Phone || "—"}</td>
                 <td className="p-3 text-right whitespace-nowrap">
  <Can action="manage_students" fallback={<span className="text-slate-600 text-xs">—</span>}>
    <button onClick={() => openEdit(s)} className="text-amber-300 hover:text-amber-200 p-1.5 rounded-lg hover:bg-white/10 mr-1" aria-label="Edit"><Edit className="w-4 h-4" /></button>
    <button onClick={() => remove(s)} className="text-rose-300 hover:text-rose-200 p-1.5 rounded-lg hover:bg-rose-500/10" aria-label="Hapus"><Trash2 className="w-4 h-4" /></button>
  </Can>
</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500 text-sm">Tidak ada siswa sesuai pencarian / filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > limit && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/5 text-[11px] text-slate-500">
            <span>Menampilkan <span className="text-slate-300 font-semibold">{visible.length}</span> dari {filtered.length}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setLimit((l) => l + 50)} className="px-3 py-1.5 rounded-lg text-slate-200 border border-white/15 hover:bg-white/10 font-semibold">+ 50 lagi</button>
              <button onClick={() => setLimit(filtered.length)} className="text-indigo-300 hover:text-indigo-200">tampilkan semua</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeForm}>
          <div className="modal-panel glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Siswa" : "Tambah Siswa"}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MField label="NIS" icon={<Hash className="w-4 h-4" />}><input value={form.Student_ID || ""} onChange={(e) => setForm({ ...form, Student_ID: e.target.value })} required disabled={!!editing} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm disabled:opacity-50" /></MField>
                <MField label="Nama Lengkap" icon={<UserRound className="w-4 h-4" />}><input value={form.Student_Name || ""} onChange={(e) => setForm({ ...form, Student_Name: e.target.value })} required className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></MField>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">Kelas</label>
                  <div className="relative"><GraduationCap className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    {waliMode ? (
                      <select value={form.Class_Name || ""} onChange={(e) => setForm({ ...form, Class_Name: e.target.value })} required className="w-full pl-10 pr-3 py-2.5 text-sm">
                        <option value="">-- pilih kelas binaan --</option>
                        {(classPool || []).map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    ) : (
                      <input value={form.Class_Name || ""} onChange={(e) => setForm({ ...form, Class_Name: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" />
                    )}
                  </div>
                  {waliMode && <p className="text-[10px] text-slate-500 mt-1.5">Terbatas pada kelas binaan Anda.</p>}
                </div>
                <MField label="Tahun Ajaran" icon={<Hash className="w-4 h-4" />}><input value={form.Academic_Year || ""} onChange={(e) => setForm({ ...form, Academic_Year: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="2026/2027" /></MField>
                <MField label="Nama Orang Tua" icon={<UserRound className="w-4 h-4" />}><input value={form.Parent_Name || ""} onChange={(e) => setForm({ ...form, Parent_Name: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></MField>
                <MField label="No. HP Orang Tua" icon={<Phone className="w-4 h-4" />}><input value={form.Parent_Phone || ""} onChange={(e) => setForm({ ...form, Parent_Phone: e.target.value })} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></MField>
              </div>
              <MField label="Alamat" icon={<MapPin className="w-4 h-4" />}><textarea value={form.Address || ""} onChange={(e) => setForm({ ...form, Address: e.target.value })} rows={3} className="glass-input w-full pl-10 pr-3 py-2.5 text-sm" /></MField>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={busy} className="glass-button flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{editing ? "Perbarui" : "Simpan"}</button>
                <button type="button" onClick={closeForm} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/15 hover:bg-white/10">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">{label}</label>
      <div className="relative"><span className="absolute left-3 top-3 text-slate-500 pointer-events-none">{icon}</span>{children}</div>
    </div>
  );
}
