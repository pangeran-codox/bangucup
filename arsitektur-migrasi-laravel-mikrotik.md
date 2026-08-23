# Migrasi Dashboard Admin Laravel × MikroTik ke JavaScript

> **Status implementasi (Agustus 2026)**
>
> | Phase | Deskripsi | Status |
> |---|---|---|
> | Phase 1 | Frontend React + TypeScript + Vite + Shadcn/ui | ✅ Selesai |
> | Phase 2 | Laravel pure REST API (74 endpoints, Sanctum) | ✅ Selesai |
> | Phase 3 | Go Collector + WebSocket Gateway (realtime traffic) | ✅ Selesai |
> | Phase 4 | SNMP + RouterOS API lengkap di collector | 🔲 Belum |
> | Phase 5 | Historical metrics storage | 🔲 Belum |
> | Phase 6 | NOC / Grafana | 🔲 Opsional |
>
> Implementasi aktual: lihat `PROJECT-CONTEXT.md` dan `FRONTEND-ARCHITECTURE.md`.
> Dokumen ini adalah **referensi desain arsitektur** — keputusan teknis yang diambil.

---

## 1. Tujuan Migrasi

Migrasi ini bertujuan mengubah dashboard admin berbasis Filament menjadi dashboard web modern berbasis JavaScript/TypeScript yang mampu:

- Menampilkan traffic MikroTik secara realtime.
- Menampilkan status router dan client.
- Menampilkan grafik traffic dengan performa tinggi.
- Mengurangi beban Laravel dan database.
- Menghindari polling MikroTik dari setiap browser.
- Memisahkan business logic dengan network telemetry.
- Tetap mempertahankan Laravel sebagai backend utama sistem.

---

# 2. Arsitektur Target

```text
                              ┌──────────────────────────┐
                              │      React + TypeScript   │
                              │      Admin Dashboard      │
                              └────────────┬─────────────┘
                                           │
                              ┌────────────┴─────────────┐
                              │                          │
                         REST / HTTP                WebSocket
                              │                          │
                              ▼                          ▲
                    ┌──────────────────┐        ┌────────┴─────────┐
                    │     Laravel      │        │ Realtime Gateway │
                    │   Core Backend   │        │   WebSocket      │
                    └────────┬─────────┘        └────────┬─────────┘
                             │                            │
                     ┌───────┴───────┐                    │
                     │               │                  Redis
                     ▼               ▼                    ▲
                PostgreSQL         Redis                   │
                     │                                    │
                     │                             ┌──────┴───────┐
                     │                             │ Go Collector │
                     │                             └──────┬───────┘
                     │                                    │
                     │                              SNMP / API
                     │                                    │
                     │                             ┌──────▼───────┐
                     └─────────────────────────────│   MikroTik   │
                                                   └──────────────┘
```

Prinsip utama:

> Browser tidak boleh menjadi pihak yang melakukan polling langsung ke MikroTik.

MikroTik dipantau oleh collector terpusat. Data realtime kemudian didistribusikan ke dashboard.

---

# 3. Frontend

## Teknologi utama

### React

React digunakan sebagai framework/library utama untuk dashboard admin.

Alasannya:

- Cocok untuk dashboard interaktif.
- Component-based.
- Bagus untuk grafik realtime.
- Mudah mengelola banyak halaman.
- Tidak bergantung pada server-side rendering Laravel.
- Mudah dikembangkan menjadi SPA.

### TypeScript

Gunakan TypeScript, bukan JavaScript murni.

Alasannya:

- Type safety.
- Struktur data API lebih jelas.
- Mengurangi error runtime.
- Cocok untuk project dashboard yang kompleks.
- Lebih mudah dirawat ketika jumlah fitur bertambah.

### Vite

Gunakan Vite sebagai build tool.

```text
React
+
TypeScript
+
Vite
```

---

# 4. Frontend Stack yang Direkomendasikan

```text
React
TypeScript
Vite
React Router
TanStack Query
Zustand
Axios atau native fetch
ECharts / uPlot
Tailwind CSS
```

## React Router

Digunakan untuk routing halaman:

```text
/dashboard
/customers
/packages
/billing
/routers
/monitoring
/reports
/settings
```

## TanStack Query

Digunakan untuk data dari Laravel API.

Contoh:

```text
React
   ↓
TanStack Query
   ↓
Laravel API
```

Fungsinya:

- caching API response
- refetching
- loading state
- error state
- invalidation
- pagination
- synchronization data

## Zustand

Digunakan untuk state global yang memang perlu berada di sisi client.

Contoh:

```text
sidebar state
current router
dashboard preferences
filter
UI state
```

Jangan memasukkan semua data backend ke Zustand.

## Grafik

Prioritas:

1. uPlot untuk telemetry/traffic dengan banyak titik data.
2. Apache ECharts untuk dashboard yang lebih kompleks.
3. Recharts jika kebutuhan grafik relatif sederhana.

Untuk traffic network yang sangat sering berubah, uPlot atau ECharts lebih direkomendasikan.

---

# 5. Realtime Frontend

Gunakan:

```text
WebSocket
```

bukan polling 3 detik dari setiap browser.

Alur:

```text
MikroTik
   ↓
Go Collector
   ↓
Redis
   ↓
WebSocket Gateway
   ↓
React
```

Contoh event:

```json
{
  "event": "router.traffic.updated",
  "router_id": 1,
  "interface": "ether1",
  "rx_bps": 125400000,
  "tx_bps": 48200000,
  "timestamp": 1724070000
}
```

React menerima event dan memperbarui grafik tanpa meminta ulang seluruh halaman.

---

# 6. Backend Utama: Laravel

Laravel TIDAK dibuang.

Laravel berubah perannya.

## Laravel menjadi Core Backend / Business Backend

Laravel bertanggung jawab terhadap:

```text
Authentication
Authorization
Customer Management
Package Management
Billing
Payment
Invoice
User Management
Role & Permission
Router Management
Technician Management
Area Management
Reports
Configuration
Audit Log
REST API
```

Laravel tidak perlu menangani setiap update traffic realtime.

---

# 7. Laravel sebagai REST API

Frontend React berkomunikasi dengan Laravel melalui API.

Contoh:

```text
GET    /api/customers
POST   /api/customers
GET    /api/customers/{id}
PUT    /api/customers/{id}
DELETE /api/customers/{id}

GET    /api/routers
GET    /api/routers/{id}

GET    /api/packages
GET    /api/invoices
GET    /api/payments
```

Laravel menjadi sumber utama untuk business data.

---

# 8. Authentication

Gunakan authentication berbasis API.

Rekomendasi untuk SPA React + Laravel:

```text
Laravel Sanctum
```

Jika aplikasi nantinya membutuhkan OAuth/API consumer yang lebih kompleks, arsitektur authentication dapat dinaikkan kemudian.

---

# 9. Database Utama

Gunakan:

```text
PostgreSQL
```

Laravel tetap menjadi pemilik business database.

Contoh tabel:

```text
users
roles
permissions

customers
customer_addresses
packages

routers
router_interfaces

invoices
payments

subscriptions
service_areas

technicians
tickets

audit_logs
```

Database ini tidak dijadikan tempat penyimpanan seluruh data telemetry realtime.

---

# 10. Redis

Redis tetap digunakan.

Namun perannya diperjelas.

Gunakan Redis untuk:

```text
Cache
Session
Queue
Rate Limiting
Realtime events
Temporary state
Pub/Sub
```

Contoh key:

```text
router:1:status
router:1:traffic
router:2:status
router:2:traffic
```

Redis cocok untuk data realtime dan sementara.

Jangan menjadikan Redis sebagai penyimpanan histori traffic jangka panjang.

---

# 11. Network Collector

Buat service terpisah menggunakan:

```text
Go
```

Namanya dapat berupa:

```text
mikrotik-collector
```

Tanggung jawab:

- Menghubungi MikroTik.
- Mengambil telemetry.
- Mengambil status router.
- Mengambil interface traffic.
- Mengambil jumlah client.
- Mengambil CPU/RAM.
- Mengambil data network tertentu.
- Mengirim data ke Redis.
- Mendeteksi perubahan status.

Contoh:

```text
MikroTik
   ↓
Go Collector
   ↓
Redis
```

Go dipilih karena:

- ringan
- concurrency bagus
- cocok untuk service yang hidup terus
- cocok untuk network I/O
- deployment sederhana
- penggunaan resource relatif rendah

---

# 12. MikroTik Communication

Gunakan dua pendekatan.

## RouterOS API

Gunakan untuk data yang spesifik MikroTik:

```text
PPPoE
DHCP
Queue
Firewall
Active session
Configuration
Routing
```

## SNMP

Gunakan untuk telemetry standar:

```text
Interface traffic
CPU
Memory
Uptime
Interface status
Network counters
Error counters
```

Dengan demikian collector tidak memaksa satu protokol untuk semua kebutuhan.

---

# 13. Realtime Gateway

Buat service realtime terpisah.

Tanggung jawab:

```text
Redis
  ↓
WebSocket
  ↓
React
```

Gateway menerima event dari Redis lalu melakukan broadcast kepada browser yang terhubung.

Contoh:

```text
router.traffic.updated
router.status.changed
customer.connection.changed
alert.created
```

Implementasinya dapat menggunakan Go atau stack WebSocket yang kompatibel dengan infrastruktur Laravel.

Untuk skala awal, jangan membuat sistem messaging terlalu kompleks.

---

# 14. Alur Traffic Realtime

## Arsitektur lama

```text
Browser
   ↓ polling 3 detik
Laravel
   ↓
MikroTik
```

Jika ada 100 browser:

```text
100 browser
×
polling
×
MikroTik API
```

Beban dapat meningkat sesuai jumlah dashboard yang dibuka.

## Arsitektur baru

```text
MikroTik
   ↓
Go Collector
   ↓
Redis
   ↓
WebSocket
   ↓
100 Browser
```

MikroTik cukup dipantau oleh collector.

Jumlah browser tidak lagi menyebabkan jumlah polling MikroTik bertambah secara linear.

---

# 15. Data History

Pisahkan realtime dan historical data.

## Realtime

```text
MikroTik
 ↓
Collector
 ↓
Redis
 ↓
WebSocket
 ↓
React
```

## History

```text
Collector
 ↓
Metrics Storage
 ↓
React / Grafana
```

Jangan menyimpan semua telemetry realtime ke PostgreSQL utama jika volumenya tinggi.

---

# 16. Metrics Storage

Untuk tahap awal, PostgreSQL masih dapat digunakan untuk data history dengan volume yang tidak terlalu besar.

Jika telemetry sudah besar, pertimbangkan:

```text
VictoriaMetrics
```

atau:

```text
ClickHouse
```

VictoriaMetrics cocok untuk time-series metrics.

ClickHouse cocok ketika kebutuhan analytics dan volume data sudah sangat besar.

Jangan langsung memasang keduanya.

---

# 17. Grafana

Grafana bersifat opsional.

Gunakan Grafana untuk:

```text
NOC
Network monitoring
Historical traffic
Infrastructure monitoring
Troubleshooting
```

Sedangkan React digunakan untuk:

```text
Business dashboard
Customer dashboard
Router management
Billing
Realtime operational UI
```

Jangan memaksa React menggantikan seluruh fungsi observability jika Grafana sudah lebih tepat untuk kebutuhan tersebut.

---

# 18. Business Data vs Network Data

Pisahkan dengan jelas.

## Business Domain

```text
Laravel
 ↓
PostgreSQL
```

Contoh:

```text
Customer
Invoice
Payment
Package
User
Subscription
```

## Network Telemetry

```text
Go Collector
 ↓
Redis / Metrics Storage
```

Contoh:

```text
RX
TX
CPU
RAM
Interface status
Online client
Router uptime
```

Ini merupakan batas arsitektur yang sangat penting.

---

# 19. Struktur Repository yang Direkomendasikan

```text
project/
│
├── backend/
│   └── laravel/
│
├── frontend/
│   └── admin/
│       ├── src/
│       │   ├── components/
│       │   ├── layouts/
│       │   ├── pages/
│       │   ├── features/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── stores/
│       │   ├── types/
│       │   └── router/
│       └── package.json
│
├── services/
│   ├── mikrotik-collector/
│   └── realtime-gateway/
│
├── infrastructure/
│   ├── docker/
│   ├── redis/
│   ├── postgres/
│   └── monitoring/
│
└── docs/
```

---

# 20. Struktur Frontend

```text
frontend/admin/src/

├── app/
│   ├── router/
│   ├── providers/
│   └── config/
│
├── components/
│   ├── ui/
│   ├── charts/
│   ├── tables/
│   └── forms/
│
├── features/
│   ├── dashboard/
│   ├── customers/
│   ├── packages/
│   ├── billing/
│   ├── routers/
│   ├── monitoring/
│   └── reports/
│
├── services/
│   ├── api/
│   └── websocket/
│
├── stores/
│
├── hooks/
│
├── types/
│
└── pages/
```

Gunakan pendekatan feature-based agar project tetap mudah dirawat ketika fitur bertambah.

---

# 21. Docker

Semua service dapat dijalankan sebagai container:

```text
frontend
laravel
nginx
postgres
redis
mikrotik-collector
realtime-gateway
```

Jika monitoring metrics sudah diperlukan:

```text
victoriametrics
grafana
```

Jangan menambahkan container yang belum mempunyai kebutuhan nyata.

---

# 22. Pembagian Tanggung Jawab

| Komponen | Tanggung Jawab |
|---|---|
| React | UI Admin |
| TypeScript | Type safety |
| Vite | Frontend build |
| TanStack Query | API state/cache |
| Zustand | Client state |
| ECharts/uPlot | Grafik |
| WebSocket | Realtime transport |
| Laravel | Business backend |
| Sanctum | Authentication |
| PostgreSQL | Business database |
| Redis | Cache/event/queue/realtime state |
| Go Collector | MikroTik telemetry |
| RouterOS API | MikroTik-specific operations |
| SNMP | Network telemetry |
| VictoriaMetrics | Historical metrics jika diperlukan |
| Grafana | NOC/observability jika diperlukan |
| Docker | Deployment/containerization |

---

# 23. Prinsip Scaling

## Jangan lakukan

```text
100 browser
   ↓
100 polling
   ↓
Laravel
   ↓
MikroTik
```

## Lakukan

```text
MikroTik
   ↓
1 Collector
   ↓
Redis
   ↓
WebSocket
   ↓
100 browser
```

Jumlah user dashboard tidak boleh menyebabkan jumlah koneksi ke MikroTik meningkat secara linear.

---

# 24. Tahap Migrasi

## Phase 1 — Frontend

Buat:

```text
React
TypeScript
Vite
React Router
TanStack Query
```

Migrasikan halaman:

```text
Login
Dashboard
Customers
Packages
Routers
Billing
```

## Phase 2 — Laravel API

Ubah Laravel menjadi API backend yang rapi.

Pisahkan:

```text
Controller
Service
Repository jika memang diperlukan
Resource
Request validation
Policy
```

## Phase 3 — Realtime

Buat:

```text
Go Collector
Redis
WebSocket Gateway
```

Migrasikan traffic realtime dari polling Filament.

## Phase 4 — Network Telemetry

Tambahkan:

```text
SNMP
RouterOS API
```

## Phase 5 — Historical Metrics

Jika volume telemetry sudah membutuhkan storage khusus:

```text
VictoriaMetrics
```

## Phase 6 — NOC

Jika dibutuhkan:

```text
Grafana
Alerting
Network overview
Historical analysis
```

---

# 25. Target Akhir

Arsitektur final:

```text
                         ┌─────────────────────┐
                         │ React + TypeScript   │
                         │ Admin Dashboard      │
                         └──────┬───────┬──────┘
                                │       │
                              REST    WebSocket
                                │       │
                                ▼       ▼
                         ┌──────────┐ ┌────────────┐
                         │ Laravel  │ │ Realtime   │
                         │ Backend  │ │ Gateway    │
                         └────┬─────┘ └──────┬─────┘
                              │              │
                              ▼              │
                         PostgreSQL          │
                                             │
                                           Redis
                                             ▲
                                             │
                                      ┌──────┴──────┐
                                      │ Go Collector│
                                      └──────┬──────┘
                                             │
                                  ┌──────────┴──────────┐
                                  │                     │
                                SNMP              RouterOS API
                                  │                     │
                                  └──────────┬──────────┘
                                             ▼
                                         MikroTik
```

---

# 26. Rekomendasi Final

Untuk kondisi proyek saat ini, gunakan stack berikut:

```text
FRONTEND
React + TypeScript + Vite

UI
Tailwind CSS + komponen UI pilihan

DATA FETCHING
TanStack Query

STATE
Zustand

CHART
uPlot / Apache ECharts

BACKEND
Laravel API

AUTH
Laravel Sanctum

DATABASE
PostgreSQL

CACHE / EVENT
Redis

NETWORK COLLECTOR
Go

NETWORK PROTOCOL
SNMP + MikroTik RouterOS API

REALTIME
WebSocket

METRICS STORAGE
PostgreSQL terlebih dahulu
→ VictoriaMetrics ketika volume telemetry meningkat

NOC / OBSERVABILITY
Grafana (opsional)

DEPLOYMENT
Docker
```

## Keputusan Arsitektur

Filament **dihapus dari dashboard utama**.

Laravel **tetap dipertahankan sebagai core backend**, bukan diganti.

React menjadi **admin frontend**.

Go menjadi **network telemetry collector**.

Redis menjadi **realtime/cache/event layer**.

WebSocket menjadi **transport realtime ke browser**.

PostgreSQL menjadi **business database**.

Metrics storage khusus ditambahkan **hanya ketika volume telemetry sudah membutuhkannya**.

Dengan desain ini, sistem dapat berkembang dari RT/RW Net kecil menuju platform network management yang lebih besar tanpa harus mengubah seluruh fondasi arsitektur.
