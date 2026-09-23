# Sertifikat Pelatihan ITTS

Aplikasi web untuk menerbitkan dan memvalidasi sertifikat peserta webinar, pelatihan, workshop, seminar, dan kegiatan lain di Institut Teknologi Tangerang Selatan (ITTS).

## Fitur

- Login admin sederhana berbasis environment variables.
- Master kegiatan dan master template sertifikat per kegiatan.
- Template gambar sertifikat dapat diunggah dalam PNG/JPG/WebP.
- Template default tersedia jika admin tidak mengunggah gambar.
- Editor layout visual: teks dan QR Code dapat digeser langsung pada preview.
- Placeholder dinamis:
  - `{{participant_name}}`
  - `{{certificate_number}}`
  - `{{event_title}}`
  - `{{event_date}}`
  - `{{organizer}}`
  - `{{signatory}}`
- Penerbitan peserta secara batch melalui textarea CSV sederhana.
- Nomor sertifikat dapat diisi manual atau dibuat otomatis.
- QR Code pada setiap sertifikat menuju halaman validasi publik.
- Status sertifikat: `valid` atau `revoked`.
- Sertifikat dapat diunduh sebagai PNG dan PDF.
- Data disimpan di PostgreSQL/Neon.
- Upload gambar menggunakan Vercel Blob jika tersedia; jika tidak, gambar disimpan sebagai data URL pada PostgreSQL.
- Siap untuk deployment di Vercel.

## Arsitektur

```text
Browser
  |
  |-- Public
  |     |-- /                         Landing page
  |     |-- /certificate/:id         Tampilan sertifikat + download
  |     '-- /verify/:publicId         Validasi QR Code
  |
  '-- Admin
        |-- /login
        |-- /admin
        |-- /admin/events/new
        '-- /admin/events/:id
               |
               |-- Master kegiatan
               |-- Editor template
               |-- Upload template
               |-- Batch peserta
               '-- Revoke/restore certificate

Next.js App Router / Vercel Functions
  |
  |-- PostgreSQL / Neon
  '-- Vercel Blob (opsional)
```

## Requirement

- Node.js 20 atau lebih baru.
- PostgreSQL. Untuk Vercel direkomendasikan menggunakan Neon melalui Vercel Marketplace.
- Akun Vercel untuk deployment.

## Environment Variables

Salin `.env.example` menjadi `.env.local`.

```env
DATABASE_URL=postgresql://...
ADMIN_EMAIL=admin@itts.ac.id
ADMIN_PASSWORD=gunakan-password-yang-kuat
AUTH_SECRET=isi-random-secret-minimal-24-karakter
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Keterangan

| Variable | Wajib | Fungsi |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi PostgreSQL/Neon. |
| `ADMIN_EMAIL` | Ya | Email login admin. |
| `ADMIN_PASSWORD` | Ya | Password login admin. |
| `AUTH_SECRET` | Ya | HMAC signing untuk session cookie admin. Gunakan nilai acak minimal 24 karakter. |
| `BLOB_READ_WRITE_TOKEN` | Tidak | Token Vercel Blob. Jika kosong, upload template disimpan inline di PostgreSQL. |
| `NEXT_PUBLIC_APP_URL` | Disarankan | URL canonical aplikasi agar QR Code menggunakan domain produksi. |

> Jangan commit file `.env` atau nilai secret ke repository.

## Menjalankan Lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

Schema tabel akan dibuat otomatis ketika aplikasi pertama kali mengakses database.

## Format Batch Peserta

Pada halaman kegiatan, masukkan satu peserta per baris:

```text
Nama Peserta,email@example.com,ITTS/WEB/2026/001
Peserta Kedua,peserta2@example.com
Peserta Ketiga
```

Delimiter yang didukung:

- koma `,`
- titik koma `;`
- pipe `|`

Email dan nomor sertifikat bersifat opsional. Jika nomor sertifikat kosong, sistem membuat nomor unik dari prefix kegiatan, tahun, dan random suffix.

## Deploy ke Vercel

### 1. Import repository

Import repository ini ke Vercel:

`taufikiqbalr/sertifikat-pelatihan-itts`

Framework akan terdeteksi sebagai Next.js.

### 2. Buat database Neon

Di Vercel Dashboard:

1. Buka project.
2. Buka **Storage / Marketplace**.
3. Tambahkan **Neon Postgres**.
4. Hubungkan database ke project.
5. Pastikan `DATABASE_URL` tersedia pada Production dan Preview.

Tidak diperlukan migration manual; aplikasi menjalankan `CREATE TABLE IF NOT EXISTS` pada first access.

### 3. Atur admin secret

Tambahkan environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`

Contoh membuat `AUTH_SECRET`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

### 4. Opsional: Vercel Blob

Jika ingin template gambar disimpan di object storage:

1. Tambahkan **Vercel Blob** pada project.
2. Vercel akan menyediakan `BLOB_READ_WRITE_TOKEN`.
3. Redeploy.

Tanpa Blob, upload template tetap dapat dipakai karena aplikasi menyimpan image sebagai base64 di PostgreSQL, dengan batas file 4 MB.

### 5. Set URL produksi

Set:

```env
NEXT_PUBLIC_APP_URL=https://nama-project.vercel.app
```

atau gunakan custom domain seperti:

```env
NEXT_PUBLIC_APP_URL=https://sertifikat.itts.ac.id
```

Kemudian redeploy agar QR Code menggunakan domain produksi.

## Struktur Database

### events

Menyimpan:

- identitas kegiatan,
- tanggal kegiatan,
- penyelenggara,
- penandatangan,
- prefix nomor,
- URL gambar template,
- JSON konfigurasi field/layout,
- posisi QR Code,
- status kegiatan.

### certificates

Menyimpan:

- peserta,
- email,
- nomor sertifikat,
- public validation ID,
- event,
- tanggal terbit,
- status valid/revoked,
- alasan pencabutan.

## Alur Sertifikat

1. Admin membuat kegiatan.
2. Admin menggunakan template default atau upload gambar sertifikat.
3. Admin mengatur posisi teks dan QR Code pada editor.
4. Admin menyimpan master kegiatan.
5. Admin memasukkan daftar peserta.
6. Sistem menerbitkan sertifikat dan public validation ID.
7. QR Code pada sertifikat mengarah ke `/verify/:publicId`.
8. Halaman verifikasi menampilkan status sertifikat dari database.
9. Jika sertifikat dicabut, QR yang sama akan menampilkan status **Sertifikat Dicabut**.

## Security Notes

- Route dan Server Action admin memverifikasi signed HTTP-only cookie.
- Cookie menggunakan HMAC SHA-256 dan memiliki masa berlaku 12 jam.
- Upload template dibatasi 4 MB dan hanya menerima PNG/JPG/WebP.
- Secret hanya dibaca dari environment variables.
- Untuk implementasi dengan banyak admin, SSO, audit trail pengguna, atau RBAC, authentication dapat ditingkatkan ke Clerk/Auth0/SSO kampus.

## CI

GitHub Actions menjalankan:

```bash
npm install
npm run build
```

pada setiap push ke branch `main` dan pada pull request.

## Stack

- Next.js App Router
- React 19
- TypeScript
- PostgreSQL / Neon
- Vercel Blob
- QRCode React
- html-to-image
- jsPDF
- Vercel
