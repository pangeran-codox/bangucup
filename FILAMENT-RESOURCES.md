# Katalog Filament Resource — Bangucup

> Referensi lengkap semua Model + Filament Resource yang sudah dibuat.
> Baca ini kalau perlu bikin resource baru (biar konsisten polanya) atau
> perlu tau detail satu resource tanpa buka banyak file.

## Konvensi Wajib (Baca Dulu Sebelum Bikin Resource Baru)

### Struktur folder
```
app/Filament/Resources/{PluralNama}/
├── {Nama}Resource.php
├── Schemas/{Nama}Form.php
├── Tables/{Nama}sTable.php
└── Pages/
    ├── List{PluralNama}.php
    ├── Create{Nama}.php
    └── Edit{Nama}.php
```

### Namespace yang SERING SALAH (baca isu #11 di PROJECT-CONTEXT.md)
```php
// Field/input — tetap di Forms
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;

// Struktur layout & reactive utilities — PINDAH ke Schemas
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Utilities\Get;   // BUKAN Filament\Forms\Get
use Filament\Schemas\Schema;
```

### Pola umum yang selalu dipakai
- Label, `navigationLabel`, `modelLabel` → **Bahasa Indonesia**
- Form dikelompokkan pakai `Section::make('...')->columns(n)->components([...])`
- Field enum/status → `Select` dengan `options()` mapping ke label
  Indonesia, TIDAK PERNAH `TextInput` bebas
- Kolom status di tabel → `->badge()->color(fn (string $state) => match(...))`
  dengan warna semantic: `success` (hijau), `danger` (merah), `warning`
  (kuning), `gray` (netral), `info` (biru)
- Kolom non-esensial (koordinat, timestamp, dll) →
  `->toggleable(isToggledHiddenByDefault: true)`
- Field uang → `->money('IDR')` di tabel, `->prefix('Rp')` di form
- Foreign key → `Select::make('xxx_id')->relationship('relasi', 'kolom_title')
  ->searchable()->preload()`, BUKAN input angka manual
- Dropdown yang harus difilter oleh field lain (misal `subscription_id`
  cuma nampilin punya `customer_id` yang dipilih) → pakai
  `modifyQueryUsing` + `->live()` di field pemicu + `->disabled(fn (Get
  $get) => blank($get('customer_id')))`
- Ikon navigasi dipilih kontekstual per modul, bukan generic
  `OutlinedRectangleStack` bawaan default

---

## 1. Customer (Pelanggan) ✅ Ditest

**Model**: `app/Models/Customer.php`
**Relasi**: `subscriptions()`, `devices()`, `invoices()`, `tickets()`,
`notificationLogs()` — semua `hasMany`

**Form**: 3 Section — Informasi Utama (nama, telepon, email), Alamat &
Lokasi (alamat textarea, koordinat lat/lng grid 2 kolom), Status
Pelanggan (status Select, tanggal bergabung)

**Table**: badge status (active=success, isolir=danger, inactive=gray,
pending=warning), koordinat toggleable hidden

**Ikon**: `Heroicon::OutlinedUsers`

---

## 2. Package (Paket) ✅ Ditest

**Model**: `app/Models/Package.php`
**Relasi**: `subscriptions()` hasMany

**Form**: 2 Section — Detail Paket (nama, kecepatan suffix "Mbps", harga
prefix "Rp", nama profile Mikrotik), Status (toggle aktif)

**Table**: format Rupiah, suffix Mbps, filter TernaryFilter is_active

**Ikon**: `Heroicon::OutlinedWifi`

---

## 3. Subscription (Langganan) ✅ Ditest

**Model**: `app/Models/Subscription.php`
**Relasi**: `customer()`, `package()`, `odp()` belongsTo; `invoices()`,
`isolirLogs()`, `tickets()`, `assetMovements()` hasMany
**Catatan khusus**: `pppoe_password` di-`$hidden`

**Form**: 4 Section — Pelanggan & Paket (dropdown searchable+preload),
Lokasi Jaringan (odp dropdown + port_number), Kredensial PPPoE (username +
password revealable), Billing & Status (jatuh tempo 1-28, status Select,
tanggal mulai/berhenti)

**Table**: badge status (active=success, isolir=danger, terminated=gray)

**Ikon**: `Heroicon::OutlinedSignal`

---

## 4. Odp (ODP) ✅ Ditest

**Model**: `app/Models/Odp.php`
**Relasi**: `subscriptions()` hasMany
**Method khusus**: `usedPortsCount()` dan `availablePortsCount()` — hitung
dinamis via query, BUKAN kolom statis

**Form**: 2 Section — Detail ODP (nama, total port, tanggal pasang),
Lokasi (koordinat grid)

**Table**: kolom **"Pemakaian port"** computed via `->state(fn (Odp
$record) => "{$record->usedPortsCount()} / {$record->total_ports}")`,
badge warna otomatis (hijau <75%, kuning ≥75%, merah 100%)

**Ikon**: `Heroicon::OutlinedMapPin`

---

## 5. Invoice (Tagihan) ✅ Ditest

**Model**: `app/Models/Invoice.php`
**Relasi**: `customer()`, `subscription()`, `voucher()` belongsTo;
`payments()` hasMany
**Fitur khusus**: `invoice_number` **auto-generate** lewat
`static::creating()` hook, format `INV-YYYYMM-XXXX` (nomor urut per
bulan). Accessor `getFinalAmountAttribute()` = amount - discount_amount.

**Form**: 4 Section — Pelanggan & Langganan (subscription dropdown
REAKTIF, cuma nampilin punya customer yang dipilih, disabled sampai
customer dipilih), Detail Tagihan (invoice_number **disabled+dehydrated
false** karena auto-generate, type Select, period_month, due_date),
Nominal & Diskon (amount, discount_amount, voucher dropdown), Status
Pembayaran (status Select live, paid_at cuma muncul kalau status="paid")

**Table**: badge type (installation=info, monthly=primary, other=gray),
badge status (unpaid=warning, paid=success, overdue=danger,
cancelled=gray), format Rupiah

**Ikon**: `Heroicon::OutlinedDocumentText`

**⚠️ Riwayat bug**: sempat error `Get` namespace salah (isu #11), sudah
difix.

---

## 6. Payment (Pembayaran) ✅ Ditest

**Model**: `app/Models/Payment.php`
**Relasi**: `invoice()` belongsTo
**Catatan khusus**: `raw_payload` di-cast `array`. Field ini **SENGAJA
DIHAPUS dari form** — itu data mentah webhook gateway, bukan input manual.

**Form**: 2 Section — Invoice & Metode (invoice dropdown, gateway Select,
method, gateway_transaction_id), Nominal & Status (amount prefix Rp,
status Select live, paid_at cuma muncul kalau status="success")

**Table**: badge gateway (midtrans=info, xendit=primary, manual=success,
other=gray), badge status (pending=warning, success=success,
failed=danger, expired=gray)

**Ikon**: `Heroicon::OutlinedCreditCard`

**⚠️ Riwayat bug**: sama kayak Invoice, `Get` namespace salah, sudah difix.

---

## 7. Device (Perangkat) ✅ Ditest

**Model**: `app/Models/Device.php`
**Relasi**: `customer()` belongsTo
**Catatan khusus**: `const CREATED_AT = null;` — tabel cuma punya kolom
`updated_at`. **Keputusan desain**: full CRUD manual dulu (bukan
read-only), karena integrasi GenieACS belum ada yang otomatis isi data.
Nanti kalau GenieACS sudah jalan, bisa diubah jadi read-only (tinggal
hapus 'create'/'edit' dari `getPages()`).

**Form**: 2 Section — Perangkat & Pelanggan (customer dropdown,
genieacs_device_id, serial_number, brand_model), Status Monitoring
(last_status Select, last_inform_at, rx_power suffix "dBm", ssid)

**Table**: badge last_status (online=success, offline=danger,
unknown=gray), placeholder "Belum pernah" untuk `last_inform_at` yang null

**Ikon**: `Heroicon::OutlinedCpuChip`

---

## 8. Ticket (Tiket) ✅ Ditest

**Model**: `app/Models/Ticket.php`
**Relasi**: `customer()`, `subscription()`, `assignedTo()` (belongsTo User,
FK `assigned_to`) belongsTo; `replies()` hasMany
**Catatan khusus**: `const UPDATED_AT = null;` — tabel cuma punya
`created_at` dan `resolved_at`.

**Form**: 3 Section — Pelanggan & Langganan (subscription dropdown
reaktif sama pola kayak Invoice), Detail Tiket (subject, description
textarea), Prioritas & Penugasan (priority Select, status Select live,
assigned_to dropdown ke User, resolved_at cuma muncul kalau status
resolved/closed)

**Table**: badge priority (low=gray, medium=warning, high=danger), badge
status (open=info, in_progress=warning, resolved=success, closed=gray)

**Ikon**: `Heroicon::OutlinedLifebuoy`

**⚠️ Riwayat bug**: user awalnya lupa update `app/Models/Ticket.php` dari
stub kosong ke versi lengkap sebelum generate resource → error "The
relationship [customer] does not exist on the model". **Pelajaran**:
selalu ingatkan urutan yang benar — isi model dulu SEBELUM generate
Filament Resource, karena Filament introspeksi relasi model saat generate.

---

## 9. Voucher ⚠️ Belum ditest user

**Model**: `app/Models/Voucher.php`
**Relasi**: `invoices()` hasMany
**Catatan khusus**: `const UPDATED_AT = null;`

**Form**: 2 Section — Detail Voucher (code unique, applies_to Select,
type Select live, value dengan prefix dinamis % atau Rp tergantung type),
Masa Berlaku & Kuota (valid_from, valid_until, max_usage)

**Table**: format nilai dinamis (`{value}%` atau `Rp{value}`), kolom
"Terpakai" format `{used_count} / {max_usage}`

**Ikon**: `Heroicon::OutlinedTicket`

---

## 10. Asset (Aset) ⚠️ Belum ditest user

**Model**: `app/Models/Asset.php`
**Relasi**: `movements()` hasMany

**Form**: 1 Section — nama, kategori, SKU, stock_qty, satuan

**Table**: badge stock_qty warna otomatis (≤0=danger, ≤5=warning,
lainnya=success), suffix satuan dinamis

**Ikon**: `Heroicon::OutlinedArchiveBox`

**Catatan penting**: `stock_qty` idealnya cuma diisi manual buat stok
awal. Setelah itu, perubahan stok harusnya lewat `AssetMovement` (yang
otomatis update `stock_qty` — lihat resource #11).

---

## 11. AssetMovement (Pergerakan Aset) ⚠️ Belum ditest user

**Model**: `app/Models/AssetMovement.php`
**Relasi**: `asset()`, `subscription()` belongsTo
**Fitur khusus**: `static::created()` hook — otomatis
`increment`/`decrement` `stock_qty` di `Asset` terkait sesuai `type`
(in/out). **Jangan dobel edit stock_qty manual kalau sudah pakai ini.**

**Form**: 1 Section — asset dropdown, type Select, qty, subscription
dropdown (opsional), note

**Table**: badge type (in=success "Masuk", out=warning "Keluar")

**Ikon**: `Heroicon::OutlinedArrowsRightLeft`

---

## 12. IsolirLog (Log Isolir) ⚠️ Belum ditest user

**Model**: `app/Models/IsolirLog.php`
**Relasi**: `subscription()`, `admin()` (belongsTo User, FK `admin_id`)
**Catatan khusus**: `const UPDATED_AT = null;`

**Form**: 1 Section — subscription dropdown, action Select, triggered_by
Select **live**, admin dropdown **cuma muncul kalau triggered_by="admin"**,
reason

**Table**: badge action (isolir=danger, restore=success), badge
triggered_by (system/admin, warna gray)

**Ikon**: `Heroicon::OutlinedNoSymbol`

**Catatan desain**: sekarang full CRUD manual biar bisa ditest. Nanti
begitu integrasi Mikrotik jalan, kemungkinan besar record ini diisi
otomatis oleh scheduler/job, bukan manual lewat form ini.

---

## 13. NotificationLog (Log Notifikasi) ⚠️ Belum ditest user

**Model**: `app/Models/NotificationLog.php`
**Relasi**: `customer()` belongsTo
**Catatan khusus**: `const CREATED_AT = null;` DAN `const UPDATED_AT =
null;` — tabel cuma punya `sent_at`.

**Form**: 1 Section — customer dropdown, type Select, channel Select,
status Select, sent_at (default now())

**Table**: badge channel (whatsapp=success, email=info), badge status
(sent=success, failed=danger)

**Ikon**: `Heroicon::OutlinedBellAlert`

---

## 14. TicketReply (Balasan Tiket) ⚠️ Belum ditest user — Disembunyikan dari sidebar

**Model**: `app/Models/TicketReply.php`
**Relasi**: `ticket()`, `user()` belongsTo
**Catatan khusus**: `const UPDATED_AT = null;`.
**`shouldRegisterNavigation()` return `false`** — resource ini SENGAJA
tidak muncul di sidebar. Alasan: secara UX, balasan tiket harusnya
diakses dari dalam halaman detail Ticket (sebagai Relation Manager),
bukan menu terpisah. Untuk sekarang masih bisa diakses manual lewat
`/admin/ticket-replies`.

**Form**: 1 Section — ticket dropdown, user dropdown (opsional, kosong =
balasan dari pelanggan), message textarea

**Table**: badge "Dibalas oleh" (ada nama=info, kosong="Pelanggan"=gray)

**Ikon**: `Heroicon::OutlinedChatBubbleLeftRight`

**TODO**: convert jadi Relation Manager di `TicketResource` biar diakses
dari tab di halaman detail tiket, bukan resource terpisah.

---

## Ringkasan Cepat: Semua Ikon yang Dipakai

| Resource | Ikon |
|---|---|
| Customer | `OutlinedUsers` |
| Package | `OutlinedWifi` |
| Subscription | `OutlinedSignal` |
| Odp | `OutlinedMapPin` |
| Invoice | `OutlinedDocumentText` |
| Payment | `OutlinedCreditCard` |
| Device | `OutlinedCpuChip` |
| Ticket | `OutlinedLifebuoy` |
| Voucher | `OutlinedTicket` |
| Asset | `OutlinedArchiveBox` |
| AssetMovement | `OutlinedArrowsRightLeft` |
| IsolirLog | `OutlinedNoSymbol` |
| NotificationLog | `OutlinedBellAlert` |
| TicketReply | `OutlinedChatBubbleLeftRight` (hidden dari nav) |

Kalau bikin resource baru, pilih ikon yang belum dipakai dan kontekstual
sesuai fungsinya — jangan pakai `OutlinedRectangleStack` (default generik
Filament, sudah diganti semua).
