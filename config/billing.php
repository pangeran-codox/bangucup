<?php

return [
    // Masa tenggang (hari) setelah due_date sebelum auto-isolir dijalankan
    'isolir_grace_days' => (int) env('BILLING_ISOLIR_GRACE_DAYS', 3),
];
