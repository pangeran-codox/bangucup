# Bangucup — Sistem Monitoring & Billing RT/RW Net

> Dokumen ini adalah context lengkap project untuk memudahkan sesi Claude
> berikutnya melanjutkan development tanpa perlu tanya ulang dari nol.
> Update dokumen ini setiap kali ada perubahan arsitektur penting.
>
> **Baca juga**: `FILAMENT-RESOURCES.md` (katalog lengkap semua Filament
> Resource + gotcha namespace) dan `FRONTEND-ARCHITECTURE.md` (khusus
> React/Inertia).

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
| Container | Docker (dev only, belum ada setup production) | PHP lokal user versi lama, konflik dengan requirement Laravel 13 |

## 3. Development Lintas Komputer (PENTING)

User mengerjakan project ini dari **lebih dari satu komputer** (kode di-sync
lewat GitHub: `github.com/pangeran-codox/bangucup`). Beberapa hal WAJIB
diingat setiap kali membantu setup di komputer "baru":

### Yang IKUT lewat Git
- Semua source code (`app/`, `resources/`, `routes/`, dll)
- `docker-compose.yml`, `docker/` (Dockerfile, nginx config)
- File migration, seeder
- `schema.sql`, file dokumentasi `.md`

### Yang TIDAK IKUT lewat Git (harus di-setup ulang manual di tiap komputer)
- `.env` — di-gitignore (isi kredensial). User belum pernah bikin
  `.env.example`, jadi kalau pindah komputer, `.env` harus dibikin dari
  nol. Isi lengkap template ada di riwayat percakapan / minta user share
  ulang `.env` lama sebagai referensi kalau ada.
- `vendor/` dan `node_modules/` — hidup di **named Docker volume**
  (`vendor_data`, `node_modules_data`), bukan bind mount, jadi otomatis
  kosong di komputer baru. Perlu `composer install` dan `npm install`
  ulang di dalam container.
- **Isi database** — tiap komputer punya instance Postgres/Redis
  masing-masing (lihat bagian 4). Data yang diinput di komputer A TIDAK
  otomatis muncul di komputer B. Kalau butuh sinkron data, perlu
  `pg_dump`/`pg_restore` manual (belum pernah dilakukan, belum ada
  panduannya).

### Checklist Setup di Komputer "Baru"
1. `git clone` (atau `git pull` kalau folder sudah ada — hati-hati error
   Windows "Unlink of file ... failed", biasanya karena antivirus/VS Code
   mengunci file `.git`; kalau retry berkali-kali gagal, lebih cepat hapus
   folder dan clone ulang dari nol)
2. Cek nama Docker network yang dipakai Postgres/Redis existing di
   komputer itu — **JANGAN ASUMSI** namanya `network` seperti komputer
   sebelumnya, walau kebetulan sering sama:
   ```bash
   docker network ls
   docker inspect postgres --format "{{json .NetworkSettings.Networks}}"
   ```
   Sesuaikan `docker-compose.yml` bagian `networks:` kalau beda.
3. `docker compose build app`
4. `docker compose up -d`
5. `docker compose exec app composer install`
6. `docker compose exec node npm install`
7. Buat `.env` manual (lihat isi lengkap di bagian 5)
8. `docker compose exec app php artisan key:generate`
9. Cek `docker compose exec app php artisan migrate:status` — kalau
   tabel belum ada, jalankan `php artisan migrate`. Kalau database belum
   ada sama sekali, buat dulu lewat Adminer atau `docker exec -it
   postgres psql`.
10. `docker compose exec app php artisan make:filament-user` (bikin user
    admin baru khusus komputer ini)
11. `docker compose exec app php artisan db:seed --class=RolePermissionSeeder`

## 4. Infrastruktur Docker

### Konteks penting
User punya **banyak container project lain** yang sudah jalan duluan di
tiap komputer yang dipakai (eduzone, lab-management, maikel-bot,
absensi-gateway, dll — nama bervariasi tiap komputer). Postgres dan Redis
**tidak dibuat baru** untuk project ini — numpang ke instance existing di
komputer yang sedang dipakai:

- Container `postgres` (image `postgres:16-alpine`) — port host `5432`
- Container `redis` (image `redis:7-alpine`) — port host `6379`
- Container `adminer` — port host `8081` (untuk lihat isi database)
- Network Docker yang menghubungkan semuanya: biasanya namanya
  **`network`** (nama literal), tapi SELALU verifikasi ulang di komputer
  baru (lihat bagian 3). Salah satu komputer user bahkan pakai **Docker
  Swarm mode** (ada network tipe `overlay`) berdampingan dengan network
  `bridge` biasa — pastikan connect ke yang `bridge`/lokal, bukan overlay.

### Struktur folder project
```
<root project>\
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

Semua join ke network external (`network`), supaya bisa akses `postgres`
dan `redis` existing lewat DNS Docker (`DB_HOST=postgres`,
`REDIS_HOST=redis`). `vendor` dan `node_modules` pakai **named volume**
terpisah (`vendor_data`, `node_modules_data`) demi performa (lihat isu #8
di bawah).

### Isu yang pernah ditemukan & fix-nya (penting, jangan diulang)

1. **PHP lokal Windows versi lama**, Laravel 13 butuh ^8.3 → solusi: semua
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
   *(Belum ada fix permanen di Dockerfile — masih technical debt)*

7. **`Class "Redis" not found`** → Laravel default pakai ext-redis (PECL),
   tidak diinstall di image. Fix: pakai `predis/predis` (pure PHP) +
   `.env`: `REDIS_CLIENT=predis`.

8. **Semua terasa lambat** (buka `/admin` berat) → root cause: `vendor/`
   dan `node_modules/` di-bind-mount dari Windows, I/O lintas
   Windows↔WSL2 lambat untuk ribuan file kecil. Fix: named volume
   terpisah khusus untuk `vendor` dan `node_modules` (hidup sepenuhnya
   di Linux, tidak nyeberang ke Windows). Setelah pindah ke pola ini,
   harus jalankan ulang `composer install`/`npm install` di container
   tiap kali volume kosong (termasuk di komputer baru).

9. **`@vitejs/plugin-react can't detect preamble`** → lupa tambah
   `@viteReactRefresh` sebelum `@vite(...)` di `resources/views/app.blade.php`.

10. **Git Windows: "Unlink of file '.git/objects/pack/...' failed"** saat
    `git pull`/`git clone` → biasanya antivirus atau VS Code (Git
    extension) sedang mengunci file. Coba retry 2-3 kali (`y`); kalau
    tetap gagal, lebih cepat `rmdir /s /q <folder>` lalu `git clone` ulang
    dari nol daripada troubleshoot lock file.

11. **`TypeError: Argument #1 ($get) must be of type Filament\Forms\Get,
    Filament\Schemas\Components\Utilities\Get given`** → di Filament v5
    dengan arsitektur Schema terpisah ini, closure reaktif (`visible(fn
    (Get $get) => ...)`, `modifyQueryUsing`) HARUS import `Get` dari
    `Filament\Schemas\Components\Utilities\Get`, BUKAN `Filament\Forms\Get`.
    Ini sama kasusnya dengan `Grid`/`Section` yang juga pindah namespace
    ke `Filament\Schemas\Components\*`. **Base rule**: field/komponen
    (`TextInput`, `Select`, `Textarea`, dll) tetap di `Filament\Forms\Components\*`,
    tapi utilitas untuk *struktur layout* dan *reactive closures*
    (`Section`, `Grid`, `Get`, `Set`) pindah ke `Filament\Schemas\Components\*`.

### Cara menjalankan command (SELALU lewat container, bukan PHP lokal)
```bash
docker compose exec app php artisan <command>
docker compose exec app composer <command>
docker compose exec node npm <command>
```

## 5. Environment Variables Penting (`.env`)

Belum ada `.env.example` di repo — kalau setup di komputer baru, buat
manual dengan isi ini (ganti kredensial DB sesuai komputer):

```env
APP_NAME=Bangucup
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8084

APP_LOCALE=id
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=id_ID

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=bangucup
DB_USERNAME=<ikut kredensial postgres komputer ini>
DB_PASSWORD=<ikut kredensial postgres komputer ini>

SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis

REDIS_CLIENT=predis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PREFIX=bangucup_database_

MAIL_MAILER=log
```

`REDIS_PREFIX` wajib di-set unik karena Redis dipakai bareng project lain
di komputer yang sama — tanpa prefix ini, cache/session/queue bisa bentrok.

## 6. Database

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
7. `invoices` — tagihan (`type`: installation/monthly/other), nomor
   invoice auto-generate format `INV-YYYYMM-XXXX`
8. `payments` — riwayat pembayaran gateway, `raw_payload` JSONB
9. `isolir_logs` — audit trail isolir/restore
10. `notification_logs` — riwayat notif WA/email
11. `tickets` — komplain pelanggan
12. `ticket_replies` — histori percakapan tiket
13. `assets` — inventori alat (ONU, kabel, dll), `stock_qty` di-auto-update
    lewat `AssetMovement`
14. `asset_movements` — log keluar-masuk stok
15-19. Tabel `roles`, `permissions`, `model_has_roles`,
    `model_has_permissions`, `role_has_permissions` (dari Spatie)

### Prinsip desain penting
- **Postpaid**, bukan prepaid — invoice berbasis `due_date`, bukan expired
  balance
- Enum pakai `CHECK` constraint (bukan native Postgres `ENUM` type) biar
  gampang di-`ALTER` nanti
- `devices` tabel cuma cache, data real-time tetap query ke GenieACS API
- `odps.total_ports` dibandingkan secara dinamis (query COUNT), bukan
  kolom `used_ports` statis — lihat method `usedPortsCount()` di model `Odp`
- `assets.stock_qty` diupdate otomatis lewat event `booted()` di model
  `AssetMovement`, jangan diedit manual dobel

## 7. Role & Permission (Spatie)

Seeder: `database/seeders/RolePermissionSeeder.php` — WAJIB dipanggil dari
`DatabaseSeeder.php`. **Harus dijalankan ulang di tiap komputer baru**
(`php artisan db:seed --class=RolePermissionSeeder`) karena data role/
permission tidak ikut lewat Git.

### 4 Role
| Role | Akses |
|---|---|
| `super_admin` | Semua permission (48 total), termasuk kelola roles/users |
| `admin` | Semua operasional, TIDAK bisa kelola roles/users |
| `staff` | CRUD (tanpa delete) untuk customers, subscriptions, invoices, payments, tickets, vouchers |
| `teknisi` | View+update tickets, devices, assets; view-only odps & subscriptions |

Format nama permission: `{action}_{module}`, contoh `view_customers`,
`create_invoices`. Model `User` sudah pakai trait
`Spatie\Permission\Traits\HasRoles`. User pertama di tiap komputer
(dibuat via `make:filament-user`) otomatis di-assign `super_admin` oleh
seeder.

**Belum diterapkan**: seeder ini baru generate role/permission-nya saja.
Belum ada gating aktual di Filament Resource (misal `canViewAny()` cek
permission). Ini technical debt untuk sesi berikutnya.

## 8. Filament Panel Config

File: `app/Providers/Filament/AdminPanelProvider.php`
- Warna primary: `Color::Amber`
- Dark mode default: `->defaultThemeMode(ThemeMode::Dark)`
- Brand name: `->brandName('Bangucup')`
- Panel ID: `admin`, path: `/admin`

## 9. Status Resource (ringkas — detail lengkap di `FILAMENT-RESOURCES.md`)

**Selesai & sudah ditest oleh user:**
Customer (Pelanggan), Package (Paket), Subscription (Langganan), Odp,
Invoice (Tagihan), Payment (Pembayaran), Device (Perangkat), Ticket (Tiket)

**Sudah disiapkan (kode lengkap dibuat), BELUM ditest user:**
Voucher, Asset, AssetMovement (Pergerakan Aset), IsolirLog (Log Isolir),
NotificationLog (Log Notifikasi), TicketReply (Balasan Tiket — sengaja
disembunyikan dari sidebar navigasi)

**Belum dikerjakan sama sekali:**
Tidak ada lagi — semua 14 tabel data (di luar tabel Spatie) sudah punya
resource. Yang tersisa cuma **gating permission** dan **integrasi
eksternal** (lihat bagian 10).

## 10. Yang Belum Dikerjakan Sama Sekali (Roadmap Besar)

1. **Test & fix bug di 6 resource yang baru disiapkan** (lihat bagian 9)
   — kemungkinan ada isu namespace `Get` (lihat isu #11) yang belum
   ketauan di beberapa form baru
2. **Gating permission di Filament Resource** (pakai role/permission yang
   sudah di-seed)
3. **Convert `TicketReply` jadi Relation Manager** di dalam
   `TicketResource` (sekarang masih resource terpisah yang disembunyikan)
4. **Integrasi Mikrotik API** (`evilfreelancer/routeros-api-php`) — untuk
   isolir otomatis via PPPoE profile switching
5. **Setup GenieACS** (terpisah, kemungkinan docker-compose sendiri) +
   integrasi NBI API ke Laravel
6. **Integrasi payment gateway** (Midtrans/Xendit) + webhook handler
   (nanti `Payment.raw_payload` diisi dari sini)
7. **Scheduler otomatis**: cek invoice jatuh tempo → trigger isolir; cek
   pembayaran masuk → buka isolir
8. **Halaman React/Inertia** untuk portal pelanggan (base project React
   sudah jalan, tapi baru ada 1 halaman percobaan `Welcome.jsx`)
9. **Notifikasi WhatsApp** (Fonnte/Wablas API) untuk reminder tagihan
10. Fix permanen permission `storage/` (masih pakai `chmod 777` manual)
11. Bikin `.env.example` supaya setup di komputer baru lebih gampang
    (sekarang harus rekonstruksi manual tiap kali)
12. Pertimbangkan cara sinkron data antar-komputer kalau memang perlu
    (`pg_dump`/`pg_restore`), atau terima aja tiap komputer punya data
    percobaan sendiri-sendiri selama masih tahap development

## 11. File Referensi Penting yang Sudah Dibuat

- `schema.sql` — full PostgreSQL schema
- 14 file migration Laravel custom (`database/migrations/2026_07_28_*`)
- `RolePermissionSeeder.php`
- `docker-compose.yml`, `docker/php/Dockerfile`, `docker/nginx/default.conf`,
  `.dockerignore` — semua sudah di-iterasi berkali-kali, JANGAN dibuat
  ulang dari nol, cukup dibaca dari project existing user
- `FILAMENT-RESOURCES.md` — katalog semua Model + Resource yang sudah
  dibuat, termasuk kode lengkapnya, biar gampang direferensikan kalau
  perlu bikin resource baru dengan pola yang konsisten

## 12. Catatan Gaya Komunikasi dengan User Ini

- User masih belajar (baru pertama kali setup Docker + Laravel + Filament),
  jelasin istilah teknis secara singkat tiap kali dipakai pertama kali,
  tapi sudah lumayan familiar dengan alur kerja dasar sekarang (jalankan
  command, screenshot error, dll) — gak perlu ulang-ulang basic banget
- User pakai Windows + Laragon + Docker Desktop, akses command lewat CMD
  (`c:\laragon\www\bangucup>` atau path serupa), bukan lewat WSL langsung
- User kerja dari **lebih dari satu komputer** — selalu tanya/cek dulu
  kalau ada indikasi environment beda dari yang terakhir dibahas
- Selalu minta user paste isi file dulu sebelum kasih instruksi edit
  (jangan asumsi struktur file tanpa lihat, karena sering beda dari
  default akibat versi Laravel/Filament yang lebih baru dari training data)
- User punya banyak project Docker lain di komputer yang sama — selalu
  ingatkan soal potensi konflik port/resource/nama network
- Kalau user minta "siapkan semua sekalian" tanpa mau testing satu-satu
  dulu, boleh langsung kasih kode final lengkap (model+form+table+resource)
  tanpa nunggu user paste hasil `--generate` — asal tetap ikuti konvensi
  namespace yang benar (lihat isu #11) supaya minim bug pas ditest nanti
