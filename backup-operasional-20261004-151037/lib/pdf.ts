import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface RekapRow {
  nis: string;
  name: string;
  cls: string;
  hadir: number;
  sakit: number;
  terlambat: number;
  izin: number;
  alfa: number;
  total: number;
}
export interface RekapSummary {
  totalSiswa: number;
  totalHadir: number;
  totalSakit: number;
  totalTerlambat: number;
  totalIzin: number;
  totalAlfa: number;
}
export interface RekapInput {
  schoolName: string;
  tagline: string;
  principalName: string;
  logoUrl?: string;
  periodLabel: string;
  scopeLabel: string;
  generatedAt: string;
  rows: RekapRow[];
  summary: RekapSummary;
}

const INDIGO: [number, number, number] = [79, 70, 229];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

function isRasterLogo(url?: string): url is string {
  return !!url && /^data:image\/(png|jpe?g)/i.test(url);
}

export function buildRekapPdf(input: RekapInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ---- kop: pita warna + logo + identitas ----
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 9, 22, 22, 3, 3, "F");
  if (isRasterLogo(input.logoUrl)) {
    try { doc.addImage(input.logoUrl, "PNG", margin + 2, 11, 18, 18); } catch { /* abaikan logo rusak */ }
  } else {
    doc.setTextColor(...INDIGO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text((input.schoolName || "K").trim().charAt(0).toUpperCase(), margin + 11, 24, { align: "center" });
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(input.schoolName || "Kastriva Absensi", margin + 26, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(input.tagline || "Sistem Absensi Digital", margin + 26, 24);
  doc.setFontSize(8);
  doc.text("Dicetak: " + input.generatedAt, pageW - margin, 12, { align: "right" });

  // ---- judul dokumen ----
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("REKAP KEHADIRAN SISWA", margin, 50);
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.6);
  doc.line(margin, 52, margin + 70, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text("Periode  : " + input.periodLabel, margin, 58);
  doc.text("Lingkup  : " + input.scopeLabel, margin, 63);

  // ---- tabel ----
  const body = input.rows.map((r, i) => [
    String(i + 1), r.nis, r.name, r.cls,
    String(r.hadir), String(r.terlambat), String(r.sakit), String(r.izin), String(r.alfa), String(r.total),
  ]);

  autoTable(doc, {
    startY: 67,
    margin: { left: margin, right: margin },
    head: [["No", "NIS", "Nama", "Kelas", "Hadir", "Telat", "Sakit", "Izin", "Alfa", "Total"]],
    body,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2, textColor: INK, lineColor: [226, 232, 240], lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { halign: "center", cellWidth: 9 },
      1: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { halign: "center", cellWidth: 11 },
      5: { halign: "center", cellWidth: 10 },
      6: { halign: "center", cellWidth: 10 },
      7: { halign: "center", cellWidth: 10 },
      8: { halign: "center", cellWidth: 10 },
      9: { halign: "center", cellWidth: 11, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index >= 4 && d.column.index <= 8) {
        const v = parseInt(String(d.cell.raw), 10) || 0;
        if (v > 0 && d.column.index === 5) d.cell.styles.textColor = [217, 119, 6];
        if (v > 0 && d.column.index === 6) d.cell.styles.textColor = [180, 83, 9];
        if (v > 0 && d.column.index === 7) d.cell.styles.textColor = [3, 105, 161];
        if (v > 0 && d.column.index === 8) d.cell.styles.textColor = [190, 18, 60];
      }
    },
  });

  const afterY = (doc as any).lastAutoTable?.finalY ?? 70;

  // ---- ringkasan ----
  const s = input.summary;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text("Ringkasan", margin, afterY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const ringkasan = `Total siswa: ${s.totalSiswa}    Hadir: ${s.totalHadir}    Terlambat: ${s.totalTerlambat}    Sakit: ${s.totalSakit}    Izin: ${s.totalIzin}    Alfa: ${s.totalAlfa}`;
  doc.text(ringkasan, margin, afterY + 13);

  // ---- tanda tangan ----
  const signX = pageW - margin - 55;
  const signY = afterY + 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("Mengetahui,", signX, signY);
  doc.text("Kepala Sekolah", signX, signY + 5);
  doc.setFont("helvetica", "bold");
  doc.text(input.principalName || "____________________", signX, signY + 22);

  // ---- nomor halaman ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Kastriva Absensi  ·  Halaman ${i} / ${pages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  return doc;
}

export function downloadRekapPdf(input: RekapInput, filename: string) {
  buildRekapPdf(input).save(filename);
}
