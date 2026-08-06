<?php
$tables = ['subscriptions', 'customers', 'invoices', 'payments', 'devices', 'tickets'];
foreach ($tables as $table) {
    $rows = \Illuminate\Support\Facades\DB::select("
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint
        WHERE conrelid = '{$table}'::regclass AND contype = 'c'
    ");
    echo "== {$table} ==" . PHP_EOL;
    foreach ($rows as $r) {
        echo '  ' . $r->conname . ' => ' . $r->def . PHP_EOL;
    }
}