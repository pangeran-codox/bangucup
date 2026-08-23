# Docker Setup — Bangucup

> Setup dev lokal. Untuk production lihat `docker-compose.swarm.yml`.

---

## Container Dev

| Container | Image | Port | Fungsi |
|---|---|---|---|
| `bangucup-app` | custom PHP 8.4 FPM | — (9000 internal) | Laravel API |
| `bangucup-nginx` | nginx:stable-alpine | **8085** | Web server |
| `bangucup-node` | node:22-alpine | — | Node (tidak aktif, tidak ada internet) |
| `bangucup-collector` | bangucup-collector:dev | — | Go: poll MikroTik → Redis |
| `bangucup-gateway` | bangucup-gateway:dev | **8082** | Go: WebSocket gateway |

Semua join ke Docker network `network` (external — infra shared).

> Port **8081** di-pakai Adminer di setup lokal ini → gateway dev pakai **8082**.
> Di production Swarm, gateway pakai port 8081.

---

## Setup Pertama Kali

### 1. Cek Docker network

```bash
docker network ls
# Cari nama network tempat postgres dan redis jalan
# Default setup ini: "network"
# Kalau beda, edit docker-compose.yml bagian networks.infra.name
```

### 2. Build Go images (wajib, tidak ada di Docker Hub untuk dev)

```bash
docker build -t bangucup-collector:dev ./services/mikrotik-collector
docker build -t bangucup-gateway:dev ./services/realtime-gateway
```

### 3. Start semua service

```bash
docker compose up -d
```

### 4. Install PHP dependencies

```bash
docker exec bangucup-app composer install
```

### 5. Setup .env

Copy dari `.env.example` lalu isi credential yang sesuai.

```bash
docker exec bangucup-app php artisan key:generate
docker exec bangucup-app php artisan migrate
docker exec bangucup-app php artisan db:seed --class=RolePermissionSeeder
docker exec bangucup-app php artisan db:seed --class=AdminSeeder
```

### 6. Generate token untuk collector

```bash
docker exec bangucup-app php artisan tinker \
  --execute="echo App\Models\User::where('email','admin@bangucup.id')->first()->createToken('collector')->plainTextToken;"
```

Isi hasilnya ke `.env` sebagai `COLLECTOR_API_TOKEN=`.

Restart collector agar pakai token baru:
```bash
docker compose restart mikrotik-collector
```

### 7. Install frontend dependencies (dari host)

```bash
cd frontend/admin
npm install
npm run dev
# Buka http://localhost:5173
```

---

## Perintah Sehari-hari

```bash
# Start / stop
docker compose up -d
docker compose down
docker compose restart bangucup-app

# Artisan
docker exec bangucup-app php artisan migrate
docker exec bangucup-app php artisan optimize:clear
docker exec bangucup-app php artisan tinker

# Composer
docker exec bangucup-app composer install
docker exec bangucup-app composer require <package>

# Frontend (dari host)
cd frontend/admin
npm run dev
npm install <package>
npm run build

# Rebuild Go images setelah ada perubahan kode Go
docker compose build mikrotik-collector realtime-gateway
docker compose up -d mikrotik-collector realtime-gateway

# Logs
docker logs -f bangucup-app
docker logs -f bangucup-collector
docker logs -f bangucup-gateway

# Redis debug
docker exec redis redis-cli keys "bangucup:*"
docker exec redis redis-cli get "bangucup:router:3:status"
```

---

## Verifikasi Semua Jalan

```bash
# API
curl http://localhost:8085/up
curl http://localhost:8085/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@bangucup.id","password":"Admin1234!"}'

# WebSocket gateway
curl http://localhost:8082/healthz

# Redis (tunggu ~10 detik setelah collector jalan)
docker exec redis redis-cli keys "bangucup:router:*"
```

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `Class "Filament\PanelProvider" not found` | `docker exec bangucup-app sh -c "rm -rf bootstrap/cache/filament && php artisan optimize:clear"` |
| Login 500 Internal Server Error | Cek log: `docker logs bangucup-app` |
| Login redirect balik ke /login terus | Clear localStorage browser: DevTools Console → `localStorage.clear(); location.reload()` |
| API 401 padahal baru login | Token expired di localStorage — clear localStorage |
| Collector tidak jalan | Cek `COLLECTOR_API_TOKEN` di `.env` sudah diisi |
| Port 8082 gagal bind | Cek port conflict: `docker ps` — mungkin ada container lain |
| Go build gagal | Pastikan `go.sum` ada di `services/mikrotik-collector/` dan `services/realtime-gateway/` |
| `nginx: [emerg] host not found` | Race condition — `docker compose restart bangucup-nginx` |

---

## Dev vs Production

| Aspek | Dev | Prod (Swarm) |
|---|---|---|
| PHP image | Dockerfile (volume mount) | Dockerfile.prod (multi-stage) |
| Go images | local `bangucup-*:dev` | `iswant/bangucup-*:latest` (Docker Hub) |
| Gateway port | **8082** | **8081** |
| Orchestration | Docker Compose | Docker Swarm |
| Frontend | Vite dev server (`npm run dev`) | Built static (`npm run build`) |
