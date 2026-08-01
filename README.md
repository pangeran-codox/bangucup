# 📋 Bangucup — Index Dokumentasi Project

> **Untuk sesi Claude baru**: baca file-file ini secara berurutan sebelum
> mulai kerja, supaya tidak mengulang kesalahan atau tanya ulang hal yang
> sudah pernah dibahas dan diputuskan. Semua file ini upload manual di
> awal chat (user pakai Claude lewat web/app biasa, bukan Claude Code,
> jadi tidak ada auto-discovery skill).

## Urutan Baca

1. **`PROJECT-CONTEXT.md`** — Baca ini PERTAMA, selalu. Berisi ringkasan
   project, tech stack, setup multi-komputer, arsitektur Docker lengkap
   dengan semua bug yang pernah ditemukan beserta fix-nya, skema database,
   role & permission, dan roadmap yang belum dikerjakan.

2. **`FILAMENT-RESOURCES.md`** — Baca ini kalau tugas berhubungan dengan
   admin panel (bikin/edit Filament Resource). Berisi katalog lengkap 14
   resource yang sudah dibuat, konvensi namespace yang wajib diikuti
   (termasuk gotcha `Get`/`Section`/`Grid` yang sering salah), dan status
   mana yang sudah ditest vs belum.

3. **`FRONTEND-ARCHITECTURE.md`** — Baca ini kalau tugas berhubungan
   dengan React/Inertia (bukan Filament admin panel). Berisi struktur
   folder, konvensi penamaan halaman, dan catatan teknis Vite/HMR khusus
   setup Docker ini.

4. **`schema.sql`** — Skema database PostgreSQL lengkap (15 tabel custom).
   Referensi kalau butuh detail kolom/tipe data/constraint.

5. **File migration** (`database/migrations/2026_07_28_*.php` dan
   `2026_07_29_*_create_permission_tables.php`) — implementasi Laravel
   dari `schema.sql`. Jangan generate migration baru untuk tabel yang
   sudah ada di sini.

6. **`RolePermissionSeeder.php`** — Definisi role & permission. Kalau mau
   menambah modul baru yang butuh permission, tambahkan di sini.

## Aturan Emas Sebelum Mengedit Kode

1. **Selalu minta user paste isi file dulu** sebelum kasih instruksi edit
   spesifik — jangan asumsikan struktur file dari training data.

2. **Semua command dijalankan lewat Docker**, format:
   ```bash
   docker compose exec app php artisan <command>
   docker compose exec app composer <command>
   docker compose exec node npm <command>
   ```
   JANGAN sarankan command PHP/Composer/NPM langsung di CMD Windows.

3. **Ikuti konvensi namespace Filament** di `FILAMENT-RESOURCES.md` —
   `Section`/`Grid`/`Get` dari `Filament\Schemas\Components\*`, bukan
   `Filament\Forms\*`. Ini penyebab bug paling sering muncul sepanjang
   project ini.

4. **Isi model dulu sebelum generate Filament Resource** — kalau model
   masih stub kosong (`class X extends Model { // }`) pas
   `make:filament-resource --generate` dijalankan, relasi gak
   ke-detect dan bakal error "relationship does not exist" nanti pas form
   dibuka. Ingatkan user urutannya: `make:model` → isi model lengkap →
   baru `make:filament-resource --generate`.

5. **User kerja dari lebih dari satu komputer** — kalau ada tanda-tanda
   environment beda dari yang terakhir dibahas (nama network Docker beda,
   path folder beda, dll), konfirmasi dulu sebelum lanjut instruksi.

6. **Jangan bikin ulang Postgres/Redis container baru** — project ini
   numpang ke infra existing user di komputer manapun yang lagi dipakai.
   SELALU verifikasi nama network dulu (lihat `PROJECT-CONTEXT.md` bagian 3).

7. **User masih belajar** Docker/Laravel/Filament dari nol, tapi sudah
   lumayan familiar dengan alur kerja dasar — jelaskan istilah baru
   singkat, tapi jangan bertele-tele di hal yang sudah berulang kali
   dilalui.

## Status Progress (update manual tiap ada progress besar)

- [x] Setup Docker (Laravel 13 + PHP 8.4 + Postgres + Redis + Node)
- [x] 15 tabel database + migration
- [x] Inertia + React + Tailwind v4 terpasang
- [x] Filament v5 terpasang, tema Amber + dark mode
- [x] Role & Permission (Spatie) — role & permission ke-generate, BELUM
      diterapkan sebagai gating di Resource
- [x] **14 Filament Resource** — Customer, Package, Subscription, Odp,
      Invoice, Payment, Device, Ticket (semua sudah ditest); Voucher,
      Asset, AssetMovement, IsolirLog, NotificationLog, TicketReply
      (kode sudah dibuat, belum ditest user)
- [x] Setup multi-komputer tervalidasi (clone + rebuild environment dari
      nol berhasil di komputer kedua)
- [ ] Testing 6 resource yang baru disiapkan
- [ ] Gating permission di Filament Resource
- [ ] Convert TicketReply jadi Relation Manager
- [ ] Integrasi Mikrotik API (isolir otomatis)
- [ ] Setup & integrasi GenieACS
- [ ] Integrasi payment gateway (Midtrans/Xendit)
- [ ] Halaman React fungsional (baru ada 1 halaman percobaan)
- [ ] Notifikasi WhatsApp (reminder tagihan)
- [ ] Bikin `.env.example` (sekarang harus rekonstruksi manual tiap
      komputer baru)
