# Bangucup — ISP Management System

Sistem manajemen ISP (RT/RW Net): billing, pelanggan, monitoring traffic MikroTik realtime.

## Dokumen

| File | Baca kapan |
|---|---|
| **`PROJECT-CONTEXT.md`** | Selalu baca ini PERTAMA — arsitektur, stack, Docker, API, roadmap |
| **`FRONTEND-ARCHITECTURE.md`** | Saat mengerjakan React frontend (`frontend/admin/`) |
| **`README-DOCKER.md`** | Setup Docker dev, perintah sehari-hari |
| **`arsitektur-migrasi-laravel-mikrotik.md`** | Referensi desain arsitektur target |

> `FILAMENT-RESOURCES.md` dan `PANDUAN-PASANG.md` — arsip sejarah, sudah tidak relevan.

---

## Status Progress

### ✅ Selesai
- Setup Docker (Laravel 13 + PHP 8.4 + PostgreSQL 16 + Redis 7 + Node 22)
- 17 Model + 20+ migration
- **Phase 1** — React 19 + TypeScript + Vite + Shadcn/ui + TanStack Query + Zustand
- **Phase 2** — Laravel pure REST API: 74 endpoints, Sanctum auth, semua resource
- **Phase 3** — Go Collector + WebSocket Gateway: traffic MikroTik realtime
- Auth flow: login, persist token, auto-logout 401, hydration guard
- Dashboard page: stat cards dari API
- Monitoring page: WebSocket + ECharts realtime
- Docker images production: `iswant/bangucup:v1.0.1` di Docker Hub
- `docker-compose.swarm.yml` untuk Docker Swarm

### 🔲 Belum
- Phase 4 — SNMP + RouterOS API lebih lengkap
- Halaman Pelanggan CRUD
- Halaman Billing (invoice + payment)
- Halaman Router management
- Halaman Tiket, Aset, Perangkat, Pengaturan

---

## Quick Start Development

```bash
# 1. Clone
git clone https://github.com/pangeran-codox/bangucup.git
cd bangucup

# 2. Setup .env (lihat PROJECT-CONTEXT.md bagian 6)
cp .env.example .env
# Edit .env — isi DB_PASSWORD, APP_KEY, dll

# 3. Install PHP deps
docker exec bangucup-app composer install

# 4. Migrate & seed
docker exec bangucup-app php artisan key:generate
docker exec bangucup-app php artisan migrate
docker exec bangucup-app php artisan db:seed --class=RolePermissionSeeder
docker exec bangucup-app php artisan db:seed --class=AdminSeeder

# 5. Build Go images
docker build -t bangucup-collector:dev ./services/mikrotik-collector
docker build -t bangucup-gateway:dev ./services/realtime-gateway

# 6. Start semua service
docker compose up -d

# 7. Frontend dev server (dari host)
cd frontend/admin
npm install
npm run dev
# Buka http://localhost:5173
```

**Login default**: `admin@bangucup.id` / `Admin1234!`
