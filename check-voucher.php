<?php
$rows = \Illuminate\Support\Facades\DB::select("
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'vouchers'::regclass AND contype = 'c'
");
foreach ($rows as $r) {
    echo $r->conname . ' => ' . $r->def . PHP_EOL;
}