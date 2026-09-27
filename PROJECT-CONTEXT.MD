# Bangucup — Project Context

> Baca ini PERTAMA sebelum mengerjakan apapun.
> Update file ini setiap ada perubahan arsitektur penting.

---

## 1. Ringkasan

Aplikasi web all-in-one untuk ISP kecil (RT/RW Net):
- **Billing** — invoice, pembayaran, isolir otomatis
- **Monitoring** — traffic MikroTik realtime via WebSocket
- **Device management** — ONU/ONT via TR-069 (GenieACS)
- **Operasional** — tiket, aset, voucher, ODP

---

## 2. Arsitektur

```
React + TypeScript (frontend/admin/)
    │
    ├── REST API ──────►  Laravel 13 (PHP 8.4-fpm)
    │                         │
    │                     PostgreSQL 16 + Redis 7
    │
    └── WebSocket ────►  realtime-gateway (Go 1.23)
                              │
                          Redis Pub/Sub
                              ▲
                          mikrotik-collector (Go 1.23)
                              │
                        MikroTik RouterOS API
```

> Browser tidak pernah poll MikroTik langsung.
> Satu collector untuk semua router → broadcast ke semua browser via WebSocket.

---

## 3. Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| Frontend | React + TypeScript + Vite | React 19, Vite 6 |
| UI | Shadcn/ui + Radix UI + Tailwind CSS | Tailwind 3 |
| Data fetching | TanStack Query | v5 |
| State | Zustand + persist | v5 |
| Charts | ECharts (echarts-for-react) | v5 |
| Routing | React Router | v7 |
| HTTP client | Axios | v1.9 |
| Backend | Laravel | 13 (PHP 8.4) |
| Auth API | Laravel Sanctum | v4 |
| Role/Permission | spatie/laravel-permission | v8 |
| MikroTik | evilfreelancer/routeros-api-php | v1.7 |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis (predis) | 7 |
| Go Collector | Go + go-routeros + go-redis | 1.23 |
| Go Gateway | Go + coder/websocket + go-redis | 1.23 |

> **Filament dihapus** Agustus 2026. Tidak ada `app/Filament/` atau `/admin` panel.

---

## 4. Struktur Repository

```
bangucup/
├── frontend/admin/              ← React SPA
│   ├── src/
│   │   ├── app/                 ← router.tsx, queryClient.ts, ProtectedRoute.tsx
│   │   ├── components/
│   │   │   ├── ui/              ← Shadcn: Button, Input, Card, Label, dll
│   │   │   ├── charts/          ← TrafficChart (ECharts RX/TX)
│   │   │   └── layout/          ← Sidebar, Topbar, AppLayout, AuthLayout
│   │   ├── features/
│   │   │   ├── auth/            ← LoginPage, NotFoundPage
│   │   │   ├── dashboard/       ← DashboardPage (stat cards)
│   │   │   ├── monitoring/      ← MonitoringPage (WebSocket + charts)
│   │   │   ├── customers/       ← placeholder
│   │   │   ├── routers/         ← placeholder
│   │   │   └── shared/          ← ComingSoonPage
│   │   ├── hooks/
│   │   │   ├── useAuthQuery.ts  ← wrapper useQuery yg auto-disabled kalau belum login
│   │   │   └── useTrafficSocket.ts ← WebSocket hook
│   │   ├── services/
│   │   │   ├── api/             ← client.ts (axios), auth.ts
│   │   │   └── websocket/       ← trafficSocket.ts
│   │   ├── stores/              ← authStore.ts (Zustand + persist)
│   │   ├── types/               ← index.ts, realtime.ts
│   │   └── lib/                 ← utils.ts (cn, formatBps, dll)
│   ├── .env.development         ← VITE_WS_URL=ws://localhost:8082/ws
│   ├── .env.production          ← VITE_WS_URL=ws://domain.com:8081/ws
│   └── package.json
│
├── services/
│   ├── mikrotik-collector/      ← Go: poll MikroTik → Redis
│   │   ├── internal/collector/  ← poll loop concurrent
│   │   ├── internal/mikrotik/   ← RouterOS API client
│   │   ├── internal/config/
│   │   ├── main.go
│   │   ├── go.mod + go.sum
│   │   └── Dockerfile
│   └── realtime-gateway/        ← Go: Redis Pub/Sub → WebSocket
│       ├── internal/gateway/    ← Hub, WebSocket handler, client filter
│       ├── internal/config/
│       ├── main.go
│       ├── go.mod + go.sum
│       └── Dockerfile
│
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/     ← 15 controller (ApiController base + 14 resource)
│   │   ├── Resources/           ← 12 API Resources
│   │   └── Requests/            ← Form Request validation per resource
│   ├── Models/                  ← 17 model
│   └── Services/                ← MikrotikService, GenieAcsService
│
├── routes/
│   ├── api.php                  ← 74 REST endpoints
│   └── web.php                  ← GET / → JSON info app
│
├── docker-compose.yml           ← Dev: app, nginx, node, collector, gateway
├── docker-compose.swarm.yml     ← Prod: full stack Docker Swarm
├── docker/
│   ├── php/Dockerfile           ← Dev PHP-FPM
│   ├── php/Dockerfile.prod      ← Prod multi-stage build
│   └── nginx/
│       ├── default.conf         ← Dev
│       └── default.swarm.conf   ← Prod
└── .env.production              ← Template .env production (tidak di-commit)
```

---

## 5. Docker Dev

### Container

| Container | Image | Port host | Fungsi |
|---|---|---|---|
| `bangucup-app` | custom PHP 8.4 FPM | — (9000 internal) | Laravel API |
| `bangucup-nginx` | nginx:stable-alpine | **8085** | Web server + proxy ke PHP-FPM |
| `bangucup-node` | node:22-alpine | — | Node runtime (tidak aktif dev) |
| `bangucup-scheduler` | custom PHP 8.4 FPM | — | `artisan schedule:run` tiap menit |
| `bangucup-collector` | bangucup-collector:dev | — | Go: poll MikroTik → Redis |
| `bangucup-gateway` | bangucup-gateway:dev | **8082** | Go: Redis → WebSocket |

> Port 8081 dipakai Adminer di setup lokal ini → gateway dev pakai 8082.
> Di production Swarm, gateway pakai port 8081.

Semua container join network `network` (Docker external network — infra shared).

### Build Go images (wajib sekali sebelum `docker compose up`)
```bash
docker build -t bangucup-collector:dev ./services/mikrotik-collector
docker build -t bangucup-gateway:dev ./services/realtime-gateway
```

### Start
```bash
docker compose up -d
```

---

## 6. Environment Variables (.env)

```env
APP_NAME=Bangucup
APP_ENV=local
APP_KEY=          ← php artisan key:generate
APP_DEBUG=true
APP_URL=http://bangucup

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=bangucup
DB_USERNAME=laravel
DB_PASSWORD=secret123

REDIS_CLIENT=predis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=null
REDIS_DB=0
REDIS_CACHE_DB=1

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

GENIEACS_NBI_URL=http://genieacs:7557
GENIEACS_ONLINE_THRESHOLD_MINUTES=15

MIKROTIK_TIMEOUT=5
MIKROTIK_ISOLIR_PROFILE=isolir

# Masa tenggang (hari) setelah due_date sebelum auto-isolir
BILLING_ISOLIR_GRACE_DAYS=3

# Generate: docker exec bangucup-app php artisan tinker \
#   --execute="echo App\Models\User::where('email','admin@bangucup.id')->first()->createToken('collector')->plainTextToken;"
COLLECTOR_API_TOKEN=

# Untuk AdminSeeder (jalankan sekali saat setup)
ADMIN_EMAIL=admin@bangucup.id
ADMIN_PASSWORD=Admin1234!
ADMIN_NAME=Administrator
```

---

## 7. API Endpoints (74 total)

Prefix: `/api/` — semua protected kecuali login.

```
POST   /api/auth/login            ← publik
POST   /api/auth/logout           ← auth:sanctum
GET    /api/auth/me

GET    /api/dashboard/stats

GET/POST              /api/customers
GET/PUT/DELETE        /api/customers/{id}

GET/POST              /api/packages
GET/PUT/DELETE        /api/packages/{id}

GET/POST              /api/subscriptions
GET/PUT/DELETE        /api/subscriptions/{id}
POST                  /api/subscriptions/{id}/isolir
POST                  /api/subscriptions/{id}/restore

GET/POST              /api/invoices
GET/PUT/DELETE        /api/invoices/{id}
POST                  /api/invoices/{id}/mark-paid

GET/POST              /api/payments
GET                   /api/payments/{id}

GET/POST/PUT/DELETE   /api/routers/{id}
POST                  /api/routers/{id}/test-connection
GET                   /api/routers/{id}/traffic

GET/POST/PUT/DELETE   /api/tickets/{id}
POST                  /api/tickets/{id}/replies

GET/POST/PUT/DELETE   /api/assets/{id}
GET/POST              /api/assets/{id}/movements

GET/POST/PUT/DELETE   /api/odps/{id}
GET/POST/PUT/DELETE   /api/cable-routes/{id}
GET                   /api/isolir-logs + /api/isolir-logs/{id}   ← read-only
GET/POST/PUT/DELETE   /api/vouchers/{id}
GET/GET               /api/devices + /api/devices/{id}
POST                  /api/devices/{id}/refresh
GET/POST/PUT/DELETE   /api/users/{id}
POST                  /api/users/{id}/roles
```

Response format:
```json
{ "data": { ... }, "message": "OK" }
```

---

## 8. Database (17 Model)

| Model | Tabel | Catatan |
|---|---|---|
| User | `users` | HasApiTokens + HasRoles |
| Customer | `customers` | status: active/isolir/inactive/pending |
| Package | `packages` | speed_mbps, price, mikrotik_profile_name |
| Subscription | `subscriptions` | pppoe_username unique, status: active/isolir/terminated |
| Odp | `odps` | usedPortsCount(), availablePortsCount() |
| Invoice | `invoices` | **auto-generate invoice_number** di booted() |
| Payment | `payments` | raw_payload JSON |
| Voucher | `vouchers` | type: percentage/fixed |
| Device | `devices` | Cache ONU dari GenieACS |
| MikrotikRouter | `mikrotik_routers` | password di-cast `encrypted` |
| IsolirLog | `isolir_logs` | audit trail isolir/restore |
| Ticket | `tickets` | |
| TicketReply | `ticket_replies` | |
| Asset | `assets` | |
| AssetMovement | `asset_movements` | **auto-update stock_qty** di booted() |
| NotificationLog | `notification_logs` | |
| CableRoute | `cable_routes` | path di-cast `array` |

---

## 9. Roles & Permission

| Role | Akses |
|---|---|
| `super_admin` | Semua |
| `admin` | Semua kecuali kelola roles |
| `staff` | CRUD customers, subscriptions, invoices, payments, tickets, vouchers |
| `teknisi` | View+update tickets, devices, assets; view odps, subscriptions |

---

## 10. Go Services

### mikrotik-collector
- Poll semua router aktif tiap `POLL_INTERVAL_SEC` detik (default 5)
- Fetch daftar router dari `GET /api/routers` (butuh `LARAVEL_API_TOKEN`)
- Tulis ke Redis:
  - `bangucup:router:{id}:status` (TTL 15s)
  - `bangucup:router:{id}:traffic` (TTL 30s)
  - Publish ke channel `bangucup:traffic`

### realtime-gateway
- Subscribe Redis channel `bangucup:traffic`
- Broadcast payload ke browser via WebSocket
- Endpoint: `ws://host:8082/ws` (dev) / `ws://host:8081/ws` (prod)
- Health: `GET /healthz` → `{"status":"ok"}`
- Browser bisa kirim filter: `{"type":"subscribe","router_ids":[1,2]}`

---

## 11. Frontend Auth Flow

```
Login → POST /api/auth/login → { token, user }
      → authStore.setAuth(user, token)  ← Zustand persist localStorage
      → navigate('/dashboard')

Page load:
  ProtectedRoute → cek _hasHydrated (tunggu Zustand hydrate localStorage)
                → kalau !isAuthenticated → redirect /login
                → kalau isAuthenticated → render page

useAuthQuery (wrapper useQuery):
  → enabled hanya kalau hasHydrated && !!token
  → mencegah API call sebelum token tersedia

Axios 401:
  → kalau _hasHydrated && isAuthenticated → clear auth state
  → ProtectedRoute otomatis redirect /login
```

---

## 12. Halaman Frontend

| Route | Status | Keterangan |
|---|---|---|
| `/login` | ✅ | Form auth, error handling |
| `/dashboard` | ✅ | Stat cards dari API |
| `/monitoring` | ✅ | WebSocket + ECharts traffic realtime |
| `/customers` | 🔲 | Placeholder (coming soon) |
| `/packages` | 🔲 | Placeholder |
| `/billing/*` | 🔲 | Placeholder |
| `/routers` | 🔲 | Placeholder |
| `/tickets` | 🔲 | Placeholder |
| `/assets` | 🔲 | Placeholder |
| `/devices` | 🔲 | Placeholder |
| `/settings` | 🔲 | Placeholder |
| `*` | ✅ | 404 page |

---

## 13. Production (Docker Swarm)

Images di Docker Hub:
- `iswant/bangucup:v1.0.1` — Laravel app
- `iswant/bangucup-collector:latest` — Go collector (perlu build + push dulu)
- `iswant/bangucup-gateway:latest` — Go gateway (perlu build + push dulu)

```bash
# Build dan push Go images
docker build -t iswant/bangucup-collector:latest ./services/mikrotik-collector
docker push iswant/bangucup-collector:latest

docker build -t iswant/bangucup-gateway:latest ./services/realtime-gateway
docker push iswant/bangucup-gateway:latest

# Deploy
cp .env.production .env   # isi semua variable
docker network create -d overlay --attachable shared_network
docker stack deploy -c docker-compose.swarm.yml bangucup
```

---

## 14. Bug Log

| # | Masalah | Fix |
|---|---|---|
| 1 | Nginx "host not found in upstream 'app'" | resolver 127.0.0.11 + set $upstream |
| 2 | `Class "Redis" not found` | REDIS_CLIENT=predis |
| 3 | Filament panel cache masih ada setelah hapus Filament | `rm -rf bootstrap/cache/filament && php artisan optimize:clear` |
| 4 | Vite proxy `http://bangucup-nginx` gagal dari host | Ganti ke `http://localhost:8085` |
| 5 | Login sukses tapi langsung dilempar ke /login | Zustand hydration race condition — tambah `_hasHydrated` guard |
| 6 | `useQuery` fetch tanpa token sebelum hydration | Buat `useAuthQuery` wrapper dengan `enabled: hasHydrated && !!token` |
| 7 | Menu sidebar trigger logout | Semua pakai `useAuthQuery`, placeholder jadi statis `ComingSoonPage` |
| 8 | Port 8081 konflik Adminer | Gateway dev pakai port 8082 |
| 9 | PowerShell `\|` dalam token | `-e` dan `"TOKEN=2\|xxx"` dipisah jadi dua argumen |
| 10 | `create-vite` interaktif | Buat file project manual, npm dari host |
| 11 | API 404 intermiten (route ada tapi "could not be found") | Nginx upstream `app:9000` ambigu di network external — alias `app` round-robin ke project lain. Ganti ke `bangucup-app:9000` di `docker/nginx/default.conf` |

---

## 15. Roadmap

- **Phase 4** — SNMP + RouterOS API lebih lengkap di collector
- **Phase 5** — Historical metrics (PostgreSQL → VictoriaMetrics kalau volume besar)
- **Phase 6** — Semua halaman CRUD lengkap (customers, billing, routers, dll)
- **Phase 7** — Role-based UI gating di frontend
- **Phase 8** — Notifikasi WhatsApp + payment gateway
- **Phase 9** — NOC / Grafana (opsional)

---

## 16. Billing Automation (Scheduler)

Dijalankan `bangucup-scheduler` (dev) / `bangucup_scheduler` (swarm) via `artisan schedule:run`.

| Command | Schedule | Fungsi |
|---|---|---|
| `billing:generate-invoices {--month=Y-m}` | daily 00:05 | Invoice bulanan idempoten per periode untuk subscription active/isolir; amount = harga paket, due_date = `billing_due_date` (clamp akhir bulan) |
| `billing:mark-overdue` | daily 00:15 | Invoice unpaid lewat due_date → overdue |
| `billing:auto-isolir {--dry-run}` | daily 01:00 | Isolir via MikroTik jika ada invoice overdue ≤ today − `BILLING_ISOLIR_GRACE_DAYS` (default 3); IsolirLog `triggered_by=system` |

Auto-restore: `BillingService::restoreIfSettled()` dipanggil dari `InvoiceController::markPaid` dan `PaymentController::store` (payment success) — restore langganan isolir bila tidak ada sisa tagihan unpaid/overdue.

> Catatan rollout: generate pertama di pertengahan bulan membuat invoice periode berjalan yang sebagian langsung lewat due_date → bisa langsung overdue. Pakai `--month=` untuk periode depan atau lunasi manual saat migrasi.
