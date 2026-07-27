# Docker Development Environment — Bangucup

## Struktur

```
bangucup/
├── docker/
│   ├── nginx/default.conf
│   └── php/
│       ├── Dockerfile
│       └── php.ini
├── docker-compose.yml
└── (source code Laravel kamu)
```

## Setup Ini Untuk Reuse Infrastructure Existing

Compose file ini SENGAJA tidak include Postgres/Redis — kamu sudah punya container `postgres` dan `redis` yang jalan dari stack lain (eduzone). Kita numpang ke situ.

### 0. Network sudah dikonfirmasi

Nama Docker network yang dipakai stack existing kamu (postgres, redis, dll) adalah **`network`**. File `docker-compose.yml` di sini sudah di-set untuk join ke network itu (lewat alias internal `infra` yang menunjuk ke `network` — cuma nama alias, gak perlu diubah). Gak perlu langkah cek manual lagi, langsung lanjut ke step berikutnya.

### 1. Taruh file-file ini di root project Laravel

Salin folder `docker/` dan file `docker-compose.yml` ke root folder project Laravel kamu (sejajar dengan `artisan`, `composer.json`, dll).

### 2. Kalau belum ada project Laravel sama sekali

Karena masalah versi PHP lokal kamu, kita skip `composer create-project` di Windows. Caranya:

```bash
# Buat folder kosong dulu
mkdir bangucup
cd bangucup

# Taruh docker-compose.yml dan folder docker/ di sini

# Build image PHP dulu (tanpa source code Laravel, nanti kita create project DI DALAM container)
docker compose build app

# Jalankan container app sementara buat create project Laravel via Composer di dalam container
docker compose run --rm app composer create-project laravel/laravel .
```

Ini bikin Laravel 13 ter-install pakai PHP 8.4 dari dalam container, gak peduli PHP versi berapa di Windows kamu.

### 3. Buat database baru di Postgres existing

Karena Postgres-nya dipakai bareng, bikin database baru khusus buat project ini (jangan numpang di database `eduzone`). Paling gampang lewat Adminer yang udah kamu punya di `http://localhost:8081`, atau via CLI:

```bash
docker exec -it postgres psql -U <username_postgres_kamu> -c "CREATE DATABASE bangucup;"
```

Ganti `<username_postgres_kamu>` dengan user Postgres yang dipakai stack eduzone (cek di `.env` project eduzone kamu, variable `DB_USERNAME`).

### 4. Sesuaikan file `.env` Laravel

Edit `.env` di root project `bangucup`. `DB_HOST` dan `REDIS_HOST` diisi **nama container** existing (bukan `localhost`), karena sekarang app baru ini satu network sama container itu:

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=bangucup
DB_USERNAME=<username_postgres_kamu>
DB_PASSWORD=<password_postgres_kamu>

REDIS_HOST=redis
REDIS_PORT=6379

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
```

> Penting: Redis dipakai bareng juga dengan project eduzone. Supaya cache/session/queue gak tabrakan, set prefix unik di `.env`:
> ```env
> REDIS_CACHE_PREFIX=bangucup_cache
> REDIS_PREFIX=bangucup_database_
> ```

### 5. Jalankan semua service

```bash
docker compose up -d
```

### 6. Generate app key & jalankan migration

```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

### 7. Akses aplikasi

- **Laravel app**: http://localhost:8084 (port sengaja beda dari eduzone yang pakai 8083)
- **Vite dev server** (React hot-reload): jalan otomatis di port 5173, dipanggil otomatis lewat `@vite` directive di Blade/Inertia
- **Adminer** (kamu udah punya): http://localhost:8081 — pilih database `bangucup` buat lihat isi tabel

## Perintah Sehari-hari

Semua perintah `artisan` / `composer` / `npm` dijalankan **di dalam container**, bukan langsung di Windows:

```bash
# Artisan command
docker compose exec app php artisan migrate
docker compose exec app php artisan make:model Customer -m
docker compose exec app php artisan tinker

# Composer
docker compose exec app composer require spatie/laravel-permission
docker compose exec app composer require inertiajs/inertia-laravel

# NPM (kalau perlu manual, biasanya udah auto-run di service node)
docker compose exec node npm install <package>

# Masuk shell container
docker compose exec app bash

# Lihat log realtime
docker compose logs -f app

# Stop semua service
docker compose down

# Stop + hapus volume database (hati-hati, data ilang)
docker compose down -v
```

## Kenapa Setup Ini Cocok Buat Kasus Kamu

- **PHP 8.4 terkunci di dalam container** — gak peduli Laragon/Windows kamu masih PHP 8.1, di dalam Docker selalu konsisten 8.4
- **Numpang Postgres & Redis existing** — gak boros resource jalanin database server dobel, database baru cukup dibikin di server yang sama
- **Node terpisah** — biar proses `npm run dev` (Vite + React hot-reload) jalan independen dari PHP container
- **Port nginx beda** (8084) — gak bentrok sama project eduzone kamu yang udah pakai 8083

## Langkah Selanjutnya Setelah Ini Jalan

1. `docker compose exec app composer require laravel/breeze` atau langsung setup Inertia manual
2. Copy 14 file migration yang sudah dibuatkan sebelumnya ke `database/migrations/`
3. `docker compose exec app php artisan migrate`
4. Install React + Inertia + Tailwind + shadcn/ui
