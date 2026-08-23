# Frontend Architecture — Bangucup

> Fokus ke `frontend/admin/`. Baca `PROJECT-CONTEXT.md` dulu untuk gambaran besar.

---

## Stack

| Teknologi | Versi | Fungsi |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6 | Build tool |
| React Router | 7 | Client-side routing |
| TanStack Query | 5 | Server state + cache |
| Zustand | 5 | Client state (auth) |
| Axios | 1.9 | HTTP client |
| ECharts + echarts-for-react | 5 | Charts |
| Tailwind CSS | 3 | Styling |
| Shadcn/ui (Radix UI) | — | UI components |
| lucide-react | — | Icons |

---

## Struktur Folder

```
src/
├── app/
│   ├── queryClient.ts       ← TanStack Query client
│   │                           retry: false, refetchOnMount: false
│   ├── router.tsx           ← React Router v7, lazy loading
│   └── ProtectedRoute.tsx   ← ProtectedRoute + GuestRoute + useLogout
│
├── components/
│   ├── ui/                  ← Shadcn: Button, Input, Card, Label,
│   │                           Separator, Avatar, DropdownMenu
│   ├── charts/
│   │   └── TrafficChart.tsx ← ECharts RX/TX area chart
│   └── layout/
│       ├── AppLayout.tsx    ← Shell: Sidebar + Topbar + Outlet
│       ├── AuthLayout.tsx   ← Split panel login
│       ├── Sidebar.tsx      ← Nav + user section + logout
│       └── Topbar.tsx       ← Search + notif + mobile menu
│
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx    ← POST /api/auth/login
│   │   └── NotFoundPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx  ← useAuthQuery /dashboard/stats
│   ├── monitoring/
│   │   └── MonitoringPage.tsx ← useAuthQuery /routers + WebSocket
│   ├── customers/
│   │   └── CustomersPage.tsx  ← placeholder
│   ├── routers/
│   │   └── RoutersPage.tsx    ← placeholder
│   └── shared/
│       └── ComingSoonPage.tsx ← halaman statis, tidak ada query
│
├── hooks/
│   ├── useAuthQuery.ts      ← wrapper useQuery: enabled hanya kalau hasHydrated && !!token
│   └── useTrafficSocket.ts  ← WebSocket hook: history per router, auto-reconnect
│
├── services/
│   ├── api/
│   │   ├── client.ts        ← Axios: auto-attach Bearer, handle 401
│   │   └── auth.ts          ← authApi.login(), logout(), me()
│   └── websocket/
│       └── trafficSocket.ts ← TrafficSocket class, exponential backoff reconnect
│
├── stores/
│   └── authStore.ts         ← Zustand + persist localStorage
│                               fields: user, token, isAuthenticated, _hasHydrated
│
├── types/
│   ├── index.ts             ← User, Customer, Invoice, MikrotikRouter, DashboardStats...
│   └── realtime.ts          ← RouterSnapshot, InterfaceTraffic, WsSubscribeMsg
│
└── lib/
    └── utils.ts             ← cn(), formatBps(), formatCurrency(), formatDate()
```

---

## Auth Flow

### Login
```
LoginPage.handleSubmit()
  → POST /api/auth/login
    → { token, user }
      → authStore.setAuth(user, token)   ← persist localStorage
        → navigate('/dashboard')
```

### Page load (setelah refresh)
```
app load → queryClient.clear()          ← bersihkan cache lama
         → Zustand hydrate localStorage
           → _hasHydrated = true
             → ProtectedRoute cek isAuthenticated
               → kalau false → /login
               → kalau true  → render halaman
```

### Axios 401
```
response 401
  → cek: _hasHydrated && isAuthenticated
    → ya → authStore.logout() → clear state + queryClient.clear()
          → ProtectedRoute otomatis redirect /login
    → tidak → skip (belum hydrated, jangan logout)
```

---

## useAuthQuery

Semua request yang butuh auth **wajib** pakai ini, bukan `useQuery` biasa:

```ts
import { useAuthQuery } from '@/hooks/useAuthQuery'

const { data, isLoading } = useAuthQuery<MyType>({
  queryKey: ['my-key'],
  queryFn: async () => {
    const { data } = await apiClient.get('/my-endpoint')
    return data.data
  },
})
```

Ini otomatis menambahkan `enabled: hasHydrated && !!token` — query tidak akan
dieksekusi sebelum Zustand selesai hydrate dari localStorage.

---

## Routing

```
/                   → redirect /dashboard
/login              → GuestRoute → AuthLayout → LoginPage
/dashboard          → ProtectedRoute → AppLayout → DashboardPage
/monitoring         → ProtectedRoute → AppLayout → MonitoringPage
/customers          → ProtectedRoute → AppLayout → CustomersPage (placeholder)
/routers            → ProtectedRoute → AppLayout → RoutersPage (placeholder)
/packages           → ProtectedRoute → AppLayout → ComingSoonPage
/billing/*          → ProtectedRoute → AppLayout → ComingSoonPage
/tickets            → ProtectedRoute → AppLayout → ComingSoonPage
/assets             → ProtectedRoute → AppLayout → ComingSoonPage
/devices            → ProtectedRoute → AppLayout → ComingSoonPage
/settings           → ProtectedRoute → AppLayout → ComingSoonPage
*                   → NotFoundPage
```

> **Penting**: jangan pakai `<a href>` untuk navigasi internal — pakai `<Link to>` dari react-router.
> `<a href>` menyebabkan full page reload yang menghilangkan React state.

---

## WebSocket (Monitoring)

```
MonitoringPage
  → useTrafficSocket({ routerIds: [1, 2, ...] })
    → TrafficSocket.connect() → ws://localhost:8082/ws
      → onopen: send { type: "subscribe", router_ids: [...] }
      → onmessage: parse RouterSnapshot
        → setData(Map<routerId, { latest, history[60] }>)
          → RouterCard re-render → TrafficChart update
```

**TrafficSocket** reconnect: exponential backoff 2s → 3s → 4.5s → max 30s.

**history**: simpan max 60 snapshot per router = 5 menit data (interval 5 detik).

---

## Halaman Selesai vs Placeholder

| Route | Komponen | Status |
|---|---|---|
| `/login` | LoginPage | ✅ Lengkap |
| `/dashboard` | DashboardPage | ✅ Stat cards |
| `/monitoring` | MonitoringPage | ✅ Realtime chart |
| `*` | NotFoundPage | ✅ |
| `/customers` | CustomersPage | 🔲 Placeholder kosong |
| `/routers` | RoutersPage | 🔲 Placeholder kosong |
| semua lainnya | ComingSoonPage | 🔲 Statis "coming soon" |

---

## Build & Dev

```bash
# Dev — dari host (node container tidak punya internet)
cd frontend/admin
npm run dev         # http://localhost:5173

# Production build
npm run build       # output: dist/
```

Vite proxy (vite.config.ts):
```ts
proxy: { '/api': { target: 'http://localhost:8085' } }
```

Manual chunks (untuk cache efficiency):
- `echarts` chunk ~1MB — normal, cached setelah load pertama
- `react-vendor`, `query` chunk terpisah

---

## CSS / Theming

Tailwind v3 dengan CSS variables Shadcn di `src/index.css`:
- `--background/--foreground` → area konten (putih)
- `--sidebar-background` → sidebar (dark navy `hsl(224 71.4% 4.1%)`)

`cn()` helper: `clsx` + `tailwind-merge` untuk conditional class merging.

---

## Catatan Penting

- Install package baru: `cd frontend/admin && npm install <pkg>` dari **host**, bukan container
- `resources/js/` sudah tidak dipakai — semua frontend di `frontend/admin/`
- Jangan commit `node_modules/` dan `dist/` — sudah ada di `.gitignore`
- `frontend/admin/.env.development` dan `.env.production` **ikut di-commit** (tidak ada secret, hanya VITE_WS_URL)
