<?php

return [
    // Masa tenggang (hari) setelah due_date sebelum auto-isolir dijalankan
    'isolir_grace_days' => (int) env('BILLING_ISOLIR_GRACE_DAYS', 3),

    // Saklar scheduler isolir otomatis. Default MATI: nyalakan dengan sadar setelah
    // `php artisan billing:auto-isolir --dry-run` menunjukkan daftar yang masuk akal.
    // Perintah manual tetap bisa dijalankan kapan saja.
    'auto_isolir_enabled' => (bool) env('BILLING_AUTO_ISOLIR_ENABLED', false),

    // Batas pengaman: bila kandidat isolir melebihi angka ini dalam satu eksekusi,
    // seluruh eksekusi dibatalkan (kecuali memakai --limit atau --force).
    'isolir_max_per_run' => (int) env('BILLING_ISOLIR_MAX_PER_RUN', 20),
];
