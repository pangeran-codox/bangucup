# Bangucup — Sistem Monitoring & Billing RT/RW Net

> Dokumen ini adalah context lengkap project untuk memudahkan sesi Claude
> berikutnya melanjutkan development tanpa perlu tanya ulang dari nol.
> Update dokumen ini setiap kali ada perubahan arsitektur penting.

## 1. Ringkasan Project

Aplikasi web all-in-one untuk pemilik bisnis RT/RW net (ISP kecil rumahan),
mencakup:
- Monitoring perangkat pelanggan (ONU/ONT) via TR-069, terintegrasi dengan
  **GenieACS** (dijalankan terpisah, belum di-setup di project ini)
- Sistem billing bulanan (postpaid)
- Isolir otomatis pelanggan menunggak via **Mikrotik API** (PPPoE)
- Integrasi payment gateway (Midtrans/Xendit — belum di-setup)
- Admin panel internal (Filament) + kemungkinan portal pelanggan (React/Inertia)

## 2. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Backend | Laravel 13 (PHP 8.4) | Ekosistem RT/RW net Indonesia paling matang di Laravel |
| Database | PostgreSQL 16 | JSONB untuk audit payload, constraint lebih ketat |
| Cache/Queue/Session | Redis (pakai `predis`, bukan ext-redis) | Sudah tersedia di infra existing |
| Admin panel | Filament v5.7.3 | Filament + Livewire, CRUD generator |
| Frontend custom | Inertia.js + React 18 + Tailwind v4 | Untuk halaman yang butuh UI custom (bukan di panel admin) |
| Role & Permission | spatie/laravel-permission v8 | Standar de-facto Laravel |
| Container | Docker (dev only, belum ada setup production) | PHP lokal user versi 8.1, konflik dengan requirement Laravel 13 |

## 3. Infrastruktur Docker

### Konteks penting
User punya **banyak container project lain** yang sudah jalan duluan
(eduzone, lab-management, maikel-bot, absensi-gateway) di komputer yang sama
(Windows + Laragon + Docker Desktop, WSL2 backend). Postgres dan Redis
**tidak dibuat baru** untuk project ini — numpang ke instance existing:

- Container `postgres` (image `postgres:16-alpine`) — port host `5432`
- Container `redis` (image `redis:7-alpine`) — port host `6379`
- Container `adminer` — port host `8081` (untuk lihat isi database)
- Network Docker yang menghubungkan semuanya: **`network`** (nama literal,
  bukan default `bridge`)

### Struktur folder project
```
c:\laragon\www\bangucup\
├── docker\
│   ├── nginx\default.conf
│   └── php\
│       ├── Dockerfile
│       └── php.ini
├── docker-compose.yml
├── .dockerignore
├── (source code Laravel standar)
```

### Container project ini
| Service | Image | Nama container | Port host | Catatan |
|---|---|---|---|---|
| `app` | custom (`docker/php/Dockerfile`) | `bangucup-app` | — (internal 9000) | PHP-FPM 8.4 |
| `nginx` | `nginx:stable-alpine` | `bangucup-nginx` | `8084` | Web server |
| `node` | `node:22-alpine` | `bangucup-node` | `5173` | Vite dev server |

Semua join ke network external `network` (bukan bikin network sendiri),
supaya bisa akses `postgres` dan `redis` existing lewat DNS Docker
(`DB_HOST=postgres`, `REDIS_HOST=redis`).

### Isu yang pernah ditemukan & fix-nya (penting, jangan diulang)

1. **PHP lokal Windows versi 8.1**, Laravel 13 butuh ^8.3 → solusi: semua
   development dilakukan di dalam container, bukan pakai PHP lokal Laragon.

2. **`ext-intl` belum ada** (dibutuhkan Filament) → di-fix di
   `docker/php/Dockerfile` dengan menambah `libicu-dev` +
   `docker-php-ext-configure intl` + `intl` di `docker-php-ext-install`.

3. **Build gagal "invalid file request node_modules/.bin/..."** → karena
   `COPY . .` di Dockerfile ikut nyalin `node_modules` (symlink bikin
   Docker Desktop Windows crash). Fix: file `.dockerignore` di root project
   yang exclude `node_modules`, `vendor`, `.git`, dll.

4. **Nginx "host not found in upstream 'app'" saat startup** (race
   condition, container `app` belum siap pas nginx resolve DNS) → fix
   permanen di `docker/nginx/default.conf`:
   ```nginx
   location ~ \.php$ {
       resolver 127.0.0.11 valid=10s;
       set $upstream_app app:9000;
       fastcgi_pass $upstream_app;
       ...
   }
   ```
   Ditambah `restart: unless-stopped` di semua service docker-compose.

5. **Vite HMR gagal, browser connect ke `[::1]:5173` (IPv6) bukan
   `localhost`** → fix di `vite.config.js`:
   ```js
   server: {
       host: '0.0.0.0',
       port: 5173,
       strictPort: true,
       hmr: { host: 'localhost' },
   }
   ```

6. **`storage/framework/views` permission denied (`tempnam()` error)** →
   folder di-mount dari Windows dengan owner `root`, proses PHP jalan
   sebagai `www-data`. Fix sementara: `chmod -R 777 storage bootstrap/cache`.
   *(Belum ada fix permanen di Dockerfile — masih technical debt, lihat
   bagian TODO)*

7. **`Class "Redis" not found`** → Laravel default pakai ext-redis (PECL),
   tidak diinstall di image. Fix: pakai `predis/predis` (pure PHP) +
   `.env`: `REDIS_CLIENT=predis`.

8. **Semua terasa lambat** (buka `/admin` berat) → root cause: `vendor/`
   dan `node_modules/` di-bind-mount dari Windows, I/O lintas
   Windows↔WSL2 lambat untuk ribuan file kecil. Fix: named volume
   terpisah khusus untuk `vendor` dan `node_modules` (hidup sepenuhnya
   di Linux, tidak nyeberang ke Windows):
   ```yaml
   app:
     volumes:
       - vendor_data:/var/www/html/vendor
   node:
     volumes:
       - node_modules_data:/var/www/html/node_modules
   volumes:
     vendor_data:
     node_modules_data:
   ```
   Setelah ini, harus jalankan ulang `composer install` dan `npm install`
   di dalam container karena volume baru kosong.

9. **`@vitejs/plugin-react can't detect preamble`** → lupa tambah
   `@viteReactRefresh` sebelum `@vite(...)` di `resources/views/app.blade.php`.

### Cara menjalankan command (SELALU lewat container, bukan PHP lokal)
```bash
docker compose exec app php artisan <command>
docker compose exec app composer <command>
docker compose exec node npm <command>
```

## 4. Environment Variables Penting (`.env`)

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=bangucup
DB_USERNAME=<ikut kredensial postgres existing>
DB_PASSWORD=<ikut kredensial postgres existing>

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_CLIENT=predis
REDIS_PREFIX=bangucup_database_
```

`REDIS_PREFIX` wajib di-set unik karena Redis dipakai bareng project lain
(eduzone) — tanpa prefix ini, cache/session/queue bisa bentrok.

## 5. Database

Schema lengkap ada di file `schema.sql` (PostgreSQL) dan versi Laravel
migration (14 file custom, timestamp `2026_07_28_100000` s/d `100013`,
plus 5 tabel dari `spatie/laravel-permission` timestamp `2026_07_29_082029`).

### Daftar tabel (urutan sesuai dependency FK)
1. `odps` — titik distribusi jaringan (ODP), `total_ports`
2. `customers` — data pelanggan, status: `active|isolir|inactive|pending`
3. `packages` — paket internet (kecepatan, harga, nama profile Mikrotik)
4. `subscriptions` — langganan aktif (FK: customer, package, odp),
   `pppoe_username`, `billing_due_date`
5. `devices` — cache status ONU dari GenieACS (bukan sumber kebenaran utama)
6. `vouchers` — diskon/promo
7. `invoices` — tagihan (`type`: installation/monthly/other)
8. `payments` — riwayat pembayaran gateway, `raw_payload` JSONB
9. `isolir_logs` — audit trail isolir/restore
10. `notification_logs` — riwayat notif WA/email
11. `tickets` — komplain pelanggan
12. `ticket_replies` — histori percakapan tiket
13. `assets` — inventori alat (ONU, kabel, dll)
14. `asset_movements` — log keluar-masuk stok
15-19. Tabel `roles`, `permissions`, `model_has_roles`,
    `model_has_permissions`, `role_has_permissions` (dari Spatie)

### Prinsip desain penting
- **Postpaid**, bukan prepaid — invoice berbasis `due_date`, bukan expired
  balance
- Enum pakai `CHECK` constraint (bukan native Postgres `ENUM` type) biar
  gampang di-`ALTER` nanti
- `devices` tabel cuma cache, data real-time tetap query ke GenieACS API

## 6. Role & Permission (Spatie)

Seeder: `database/seeders/RolePermissionSeeder.php` — WAJIB dipanggil dari
`DatabaseSeeder.php`.

### 4 Role
| Role | Akses |
|---|---|
| `super_admin` | Semua permission (48 total), termasuk kelola roles/users |
| `admin` | Semua operasional, TIDAK bisa kelola roles/users |
| `staff` | CRUD (tanpa delete) untuk customers, subscriptions, invoices, payments, tickets, vouchers |
| `teknisi` | View+update tickets, devices, assets; view-only odps & subscriptions |

Format nama permission: `{action}_{module}`, contoh `view_customers`,
`create_invoices`. Modul: customers, subscriptions, packages, invoices,
payments, tickets, assets, odps, vouchers, devices, users, roles.

Model `User` sudah pakai trait `Spatie\Permission\Traits\HasRoles`.

User pertama (dibuat via `make:filament-user`) otomatis di-assign
`super_admin` oleh seeder.

**Belum diterapkan**: seeder ini baru generate role/permission-nya saja.
Belum ada gating aktual di Filament Resource (misal `canViewAny()` cek
permission). Ini technical debt untuk sesi berikutnya.

## 7. Filament Panel Config

File: `app/Providers/Filament/AdminPanelProvider.php`
- Warna primary: `Color::Amber`
- Dark mode default: `->defaultThemeMode(ThemeMode::Dark)`
- Brand name: `->brandName('Bangucup')`
- Panel ID: `admin`, path: `/admin`

## 8. Pola Filament Resource yang Sudah Ditetapkan

Filament v5 di project ini pakai struktur **Schema/Table terpisah** (bukan
inline di file Resource):
```
app/Filament/Resources/{Nama}/
├── {Nama}Resource.php       (cuma nunjuk ke Form/Table class + pages)
├── Schemas/{Nama}Form.php   (definisi form)
├── Tables/{Nama}sTable.php  (definisi tabel)
└── Pages/
    ├── List{Nama}s.php
    ├── Create{Nama}.php
    └── Edit{Nama}.php
```

### Konvensi yang dipakai (WAJIB diikuti resource selanjutnya biar konsisten)
- Label, `navigationLabel`, `modelLabel` semua **Bahasa Indonesia**
- Form dikelompokkan pakai `Filament\Schemas\Components\Section`
  (BUKAN `Filament\Forms\Components\Section` — namespace beda!)
- Grid/layout struktural juga dari `Filament\Schemas\Components\Grid`,
  bukan `Filament\Forms\Components\Grid`
- Field enum (status dkk) pakai `Select` dengan `options()` mapping ke
  label Indonesia, bukan `TextInput` bebas
- Kolom status di tabel pakai `->badge()` + `->color()` mapping semantic
  (success=hijau, danger=merah, warning=kuning, gray=netral)
- Kolom non-esensial (koordinat, timestamp) pakai
  `->toggleable(isToggledHiddenByDefault: true)`
- Field uang pakai `->money('IDR')` di tabel, `->prefix('Rp')` di form
- Ikon navigasi dipilih sesuai konteks modul (bukan generic
  `OutlinedRectangleStack` bawaan default), contoh: `OutlinedUsers` untuk
  Customer, `OutlinedWifi` untuk Package

### Resource yang SUDAH dibuat
- ✅ `Customer` (Pelanggan) — lengkap, form 3 section, badge status
- ✅ `Package` (Paket) — lengkap, format Rupiah, suffix Mbps

### Resource yang BELUM dibuat (urutan prioritas disarankan)
- ⬜ `Subscription` (Langganan) — perlu relasi ke Customer, Package, ODP
- ⬜ `Invoice` (Tagihan)
- ⬜ `Payment` (Pembayaran)
- ⬜ `Ticket` (Komplain)
- ⬜ `Device` (biasanya read-only, sync dari GenieACS)
- ⬜ `Odp`
- ⬜ `Voucher`
- ⬜ `Asset` & `AssetMovement`
- ⬜ `IsolirLog` & `NotificationLog` (kemungkinan cukup jadi read-only log,
  tidak perlu form create/edit manual)

## 9. Yang Belum Dikerjakan Sama Sekali (Roadmap Besar)

1. **Gating permission di Filament Resource** (pakai role/permission yang
   sudah di-seed)
2. **Integrasi Mikrotik API** (`evilfreelancer/routeros-api-php`) — untuk
   isolir otomatis via PPPoE profile switching
3. **Setup GenieACS** (terpisah, kemungkinan docker-compose sendiri) +
   integrasi NBI API ke Laravel
4. **Integrasi payment gateway** (Midtrans/Xendit) + webhook handler
5. **Scheduler otomatis**: cek invoice jatuh tempo → trigger isolir; cek
   pembayaran masuk → buka isolir
6. **Halaman React/Inertia** untuk portal pelanggan (base project React
   sudah jalan, tapi baru ada 1 halaman percobaan `Welcome.jsx`)
7. **Notifikasi WhatsApp** (Fonnte/Wablas API) untuk reminder tagihan
8. Fix permanen permission `storage/` (masih pakai `chmod 777` manual,
   idealnya di-set benar di Dockerfile/entrypoint)
9. Setup git remote push ke GitHub sudah dipandu, tapi perlu dicek apakah
   sudah benar-benar ke-push (belum dikonfirmasi di percakapan)

## 10. File Referensi Penting yang Sudah Dibuat

- `schema.sql` — full PostgreSQL schema
- 14 file migration Laravel custom (`database/migrations/2026_07_28_*`)
- `RolePermissionSeeder.php`
- `docker-compose.yml`, `docker/php/Dockerfile`, `docker/nginx/default.conf`,
  `.dockerignore` — semua sudah di-iterasi berkali-kali, JANGAN dibuat
  ulang dari nol, cukup dibaca dari project existing user

## 11. Catatan Gaya Komunikasi dengan User Ini

- User masih belajar (baru pertama kali setup Docker + Laravel + Filament),
  jelasin istilah teknis secara singkat tiap kali dipakai pertama kali
- User pakai Windows + Laragon + Docker Desktop (WSL2 backend), akses
  command lewat CMD (`c:\laragon\www\bangucup>`), bukan lewat WSL langsung
- Selalu minta user paste isi file dulu sebelum kasih instruksi edit
  (jangan asumsi struktur file tanpa lihat, karena sering beda dari
  default akibat versi Laravel/Filament yang lebih baru dari training data)
- User punya banyak project Docker lain di komputer yang sama — selalu
  ingatkan soal potensi konflik port/resource