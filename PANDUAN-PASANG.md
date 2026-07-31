# Panduan Pasang 6 Resource Sisa

Dikerjakan tanpa testing dulu — jalankan & cek nanti pas balik ke komputer awal.

## Step 1 — Buat Model Kosong yang Belum Ada

```bash
docker compose exec app php artisan make:model Asset
docker compose exec app php artisan make:model NotificationLog
```

(`Voucher`, `IsolirLog`, `TicketReply` sudah dibuat sebelumnya, tinggal isi.)

## Step 2 — Generate Filament Resource untuk Semua

Jalankan satu-satu, isi title attribute sesuai keterangan:

```bash
docker compose exec app php artisan make:filament-resource Voucher --generate
# title attribute: code

docker compose exec app php artisan make:filament-resource Asset --generate
# title attribute: name

docker compose exec app php artisan make:filament-resource AssetMovement --generate
# title attribute: (kosongkan, Enter)

docker compose exec app php artisan make:filament-resource IsolirLog --generate
# title attribute: (kosongkan, Enter)

docker compose exec app php artisan make:filament-resource NotificationLog --generate
# title attribute: (kosongkan, Enter)

docker compose exec app php artisan make:filament-resource TicketReply --generate
# title attribute: (kosongkan, Enter)
```

Semua prompt "Generate read-only view page?" jawab **No** (Enter).

## Step 3 — Timpa File yang Baru Ke-generate

Untuk tiap resource, ganti isi file berikut dengan file dari folder yang sesuai
(nama file di folder ini ada akhiran `.model.php` untuk model — itu HARUS
ditaruh ke `app/Models/`, bukan ke folder Filament):

### Voucher
| File di sini | Taruh ke |
|---|---|
| `Voucher/Voucher.model.php` | `app/Models/Voucher.php` |
| `Voucher/VoucherForm.php` | `app/Filament/Resources/Vouchers/Schemas/VoucherForm.php` |
| `Voucher/VouchersTable.php` | `app/Filament/Resources/Vouchers/Tables/VouchersTable.php` |
| `Voucher/VoucherResource.php` | `app/Filament/Resources/Vouchers/VoucherResource.php` |

### Asset
| File di sini | Taruh ke |
|---|---|
| `Asset/Asset.model.php` | `app/Models/Asset.php` |
| `Asset/AssetForm.php` | `app/Filament/Resources/Assets/Schemas/AssetForm.php` |
| `Asset/AssetsTable.php` | `app/Filament/Resources/Assets/Tables/AssetsTable.php` |
| `Asset/AssetResource.php` | `app/Filament/Resources/Assets/AssetResource.php` |

### AssetMovement
| File di sini | Taruh ke |
|---|---|
| `AssetMovement/AssetMovement.model.php` | `app/Models/AssetMovement.php` |
| `AssetMovement/AssetMovementForm.php` | `app/Filament/Resources/AssetMovements/Schemas/AssetMovementForm.php` |
| `AssetMovement/AssetMovementsTable.php` | `app/Filament/Resources/AssetMovements/Tables/AssetMovementsTable.php` |
| `AssetMovement/AssetMovementResource.php` | `app/Filament/Resources/AssetMovements/AssetMovementResource.php` |

### IsolirLog
| File di sini | Taruh ke |
|---|---|
| `IsolirLog/IsolirLog.model.php` | `app/Models/IsolirLog.php` |
| `IsolirLog/IsolirLogForm.php` | `app/Filament/Resources/IsolirLogs/Schemas/IsolirLogForm.php` |
| `IsolirLog/IsolirLogsTable.php` | `app/Filament/Resources/IsolirLogs/Tables/IsolirLogsTable.php` |
| `IsolirLog/IsolirLogResource.php` | `app/Filament/Resources/IsolirLogs/IsolirLogResource.php` |

### NotificationLog
| File di sini | Taruh ke |
|---|---|
| `NotificationLog/NotificationLog.model.php` | `app/Models/NotificationLog.php` |
| `NotificationLog/NotificationLogForm.php` | `app/Filament/Resources/NotificationLogs/Schemas/NotificationLogForm.php` |
| `NotificationLog/NotificationLogsTable.php` | `app/Filament/Resources/NotificationLogs/Tables/NotificationLogsTable.php` |
| `NotificationLog/NotificationLogResource.php` | `app/Filament/Resources/NotificationLogs/NotificationLogResource.php` |

### TicketReply
| File di sini | Taruh ke |
|---|---|
| `TicketReply/TicketReply.model.php` | `app/Models/TicketReply.php` |
| `TicketReply/TicketReplyForm.php` | `app/Filament/Resources/TicketReplies/Schemas/TicketReplyForm.php` |
| `TicketReply/TicketRepliesTable.php` | `app/Filament/Resources/TicketReplies/Tables/TicketRepliesTable.php` |
| `TicketReply/TicketReplyResource.php` | `app/Filament/Resources/TicketReplies/TicketReplyResource.php` |

## Step 4 — Clear Cache & Migrate (jika ada tabel baru belum ter-migrate)

```bash
docker compose exec app php artisan migrate
docker compose exec app php artisan optimize:clear
```

## Catatan Desain Penting

1. **`AssetMovement`** — ada logic otomatis di model (`booted()`): tiap kali
   ada record baru dibuat, `stock_qty` di tabel `assets` otomatis
   bertambah/berkurang sesuai `type` (`in`/`out`). Jangan edit `stock_qty`
   manual di form `Asset` kalau sudah pakai `AssetMovement` — nanti dobel
   hitung. Idealnya field `stock_qty` di form Asset dipakai cuma buat set
   stok awal sekali di awal.

2. **`TicketReply`** — resource ini **sengaja disembunyikan dari sidebar**
   (`shouldRegisterNavigation()` return `false`). Alasannya: secara UX,
   balasan tiket lebih natural diakses dari dalam halaman detail tiket
   (pakai Relation Manager), bukan menu terpisah. Untuk sekarang tetap
   bisa diakses manual lewat URL `/admin/ticket-replies` kalau perlu test.
   **Todo besok**: convert ini jadi Relation Manager di dalam
   `TicketResource` biar UX-nya lebih pas.

3. **`IsolirLog`** dan **`NotificationLog`** — untuk sekarang dibuatkan full
   CRUD manual biar bisa langsung dites. Nanti begitu integrasi Mikrotik
   API dan notifikasi WhatsApp beneran jalan, kemungkinan besar
   pengisian tabel ini pindah ke sistem otomatis (job/scheduler), dan
   form Create manual ini jadi jarang dipakai (tapi tetap berguna buat
   audit/koreksi manual kalau perlu).

4. Semua ikon navigasi dipilih kontekstual: Voucher = tiket diskon,
   Asset = kotak arsip, AssetMovement = panah bolak-balik, IsolirLog =
   simbol larangan, NotificationLog = lonceng.

## Setelah Semua Terpasang

Total bakal ada **14 resource** aktif di sidebar (8 yang sudah ada +
Voucher, Asset, AssetMovement, IsolirLog, NotificationLog — TicketReply
tersembunyi dari sidebar sesuai desain di atas).
