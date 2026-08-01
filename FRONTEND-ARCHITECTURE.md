# Frontend Architecture — Bangucup

> Dokumen ini fokus ke sisi frontend custom (React + Inertia), sebagai
> pelengkap `PROJECT-CONTEXT.md` yang lebih fokus ke backend/infra.
> Baca `PROJECT-CONTEXT.md` dulu untuk gambaran besar project.
>
> **Status**: belum ada progress baru di sisi ini sejak dokumen ini
> pertama dibuat — semua development terbaru fokus ke Filament Resource
> (lihat `FILAMENT-RESOURCES.md`). Bagian ini masih relevan apa adanya.

## 1. Kenapa Ada 2 Sistem Frontend Sekaligus

Project ini SENGAJA punya dua UI layer terpisah, jangan dicampur:

| Layer | Teknologi | Untuk apa | Lokasi |
|---|---|---|---|
| **Admin panel** | Filament (Livewire based) | Kelola data internal: pelanggan, invoice, tiket, aset, dll — dipakai admin/staff/teknisi | `app/Filament/Resources/**` |
| **Custom frontend** | Inertia.js + React | Halaman yang butuh UI custom bebas: portal pelanggan, dashboard monitoring real-time, landing page | `resources/js/Pages/**` |

Alasan keputusan ini: Filament kasih CRUD admin super cepat tanpa coding
manual, tapi strukturnya kaku untuk hal yang butuh desain bebas. React
dipakai HANYA untuk bagian yang benar-benar butuh fleksibilitas itu.
**Jangan bikin ulang fitur admin yang sudah ada di Filament pakai React**
— itu duplikasi kerja.

## 2. Stack Detail

- **Inertia.js v3** (`@inertiajs/react`, `inertiajs/inertia-laravel`) —
  jembatan Laravel↔React tanpa perlu bikin REST API terpisah
- **React 18** (bukan Vue — keputusan user karena ingin belajar React,
  ekosistemnya lebih besar, dan `shadcn/ui` yang direncanakan berbasis React)
- **Tailwind CSS v4** — sudah include default dari starter kit Laravel 13,
  integrasi via plugin Vite (`@tailwindcss/vite`), BUKAN via
  `tailwind.config.js` terpisah (beda dari Tailwind v3)
- **Vite** sebagai build tool, jalan di container terpisah (`node`, port
  `5173`)
- **shadcn/ui** — DIRENCANAKAN dipakai untuk komponen React yang lebih
  polished, TAPI BELUM di-install di project ini. Kalau mau install nanti,
  ingat: shadcn/ui butuh setup `components.json` + copy komponen manual
  (bukan npm package biasa)

## 3. Struktur Folder Frontend

```
resources/
├── css/
│   └── app.css              (entry Tailwind)
├── js/
│   ├── app.jsx               (entry point utama, setup createInertiaApp)
│   └── Pages/                (setiap file = 1 halaman/route)
│       └── Welcome.jsx       (halaman percobaan pertama, masih dummy)
└── views/
    └── app.blade.php         (root Blade, wadah HTML tempat React di-mount)
```

### Konvensi penamaan halaman (Inertia)
- Nama file di `resources/js/Pages/` HARUS match string yang dipakai di
  `Inertia::render('NamaFile')` dari Controller/route Laravel
- Untuk halaman bersarang, pakai folder: `Pages/Customers/Index.jsx` diakses
  lewat `Inertia::render('Customers/Index')`
- Semua file halaman WAJIB `export default function`

## 4. File Kunci & Isinya Saat Ini

### `resources/js/app.jsx`
```jsx
import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx');
        return pages[`./Pages/${name}.jsx`]();
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
```

### `resources/views/app.blade.php`
```blade
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bangucup</title>
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
```
**PENTING**: `@viteReactRefresh` HARUS ada sebelum `@vite(...)`, kalau
kelewat muncul error "can't detect preamble" di console browser.

### `bootstrap/app.php`
Middleware Inertia (`HandleInertiaRequests`) didaftarkan di sini (Laravel
13 tidak pakai `Kernel.php` lagi):
```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->web(append: [
        \App\Http\Middleware\HandleInertiaRequests::class,
    ]);
})
```

### `vite.config.js` — bagian yang WAJIB ada untuk Docker
```js
server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
        host: 'localhost',
    },
    watch: {
        ignored: ['**/storage/framework/views/**'],
    },
},
```
Tanpa `hmr.host: 'localhost'` yang eksplisit, browser akan coba connect ke
alamat IPv6 (`[::1]:5173`) yang gagal di setup Docker+Windows ini.

Plugin yang harus ada di `plugins: []`:
```js
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// ...
plugins: [
    laravel({ input: [...], refresh: true, fonts: [...] }),
    react(),
    tailwindcss(),
],
```

## 5. Halaman yang Sudah Ada

- ✅ `Pages/Welcome.jsx` — halaman percobaan, cuma nampilin teks statis
  "Halo dari React + Inertia". Route: `routes/web.php` → `GET /` →
  `Inertia::render('Welcome')`. **Ini placeholder, ganti/hapus nanti**
  begitu ada halaman React sungguhan yang mau dibangun.

## 6. Belum Dikerjakan (Frontend)

- Belum ada halaman React fungsional sama sekali selain percobaan
- Belum install `shadcn/ui`
- Belum ada layout/komponen shared (Navbar, Sidebar, dll) untuk halaman
  React — kalau mau bikin portal pelanggan, perlu dirancang dulu
- Belum ada state management pattern yang disepakati (React Context vs
  library lain) — untuk skala project ini kemungkinan React Context/hooks
  bawaan sudah cukup, belum perlu Redux/Zustand
- Belum ada konsistensi desain eksplisit antara tema Filament (Amber,
  dark mode default) dengan halaman React — kalau bikin portal pelanggan,
  pertimbangkan pakai warna Amber juga di Tailwind config biar brand
  konsisten

## 7. Cara Kerja Development Sehari-hari

Container `node` menjalankan `npm run dev -- --host` terus-menerus
(auto-restart tiap `docker compose up -d`). Tidak perlu manual jalankan
`npm run dev` — edit file `.jsx` langsung ter-hot-reload di browser.

**Catatan multi-komputer**: `node_modules` hidup di named Docker volume
(`node_modules_data`), jadi otomatis kosong tiap pindah komputer. Perlu
`docker compose exec node npm install` ulang setiap setup di komputer baru.

Untuk install package React baru:
```bash
docker compose exec node npm install <package>
```

Untuk build production (belum pernah dilakukan di project ini):
```bash
docker compose exec node npm run build
```
