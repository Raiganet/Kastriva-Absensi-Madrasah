# Kastriva Absensi Web — Next.js + Google Apps Script

## Cara Install:
1. npm install
2. cp .env.local.example .env.local
3. Isi `GAS_WEB_APP_URL` dengan URL deployment GAS yang sama dengan APK.
4. Isi `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, dan `SESSION_SECRET` untuk login web.
5. npm run dev
6. Buka http://localhost:3000

## Deploy ke Vercel:
1. Push ke GitHub
2. Import di Vercel
3. Tambahkan environment variables
4. Deploy

## Alur sinkronisasi

Dashboard Next.js meneruskan data siswa, absensi, dan pengaturan ke endpoint GAS
server-side. APK Android memanggil endpoint GAS yang sama. Keduanya karena itu
menulis dan membaca tab `Students`, `Attendance`, dan `Settings` pada satu
spreadsheet.

Endpoint GAS harus di-deploy sebagai **Web app**, dijalankan sebagai pemilik
spreadsheet, dan dapat diakses perangkat yang memakai APK. Untuk project GAS
standalone, isi Script Property `SPREADSHEET_ID`; project yang dibuat dari
**Extensions → Apps Script** pada spreadsheet dapat memakai spreadsheet aktif.

Web login dan login APK masih menggunakan tab akun terpisah (`WebUsers` untuk
cookie session Next.js dan `Users` untuk login GAS). Data absensi sudah bersama;
akun scanner perlu dibuat di tab `Users` sampai autentikasi disatukan pada tahap
berikutnya.
