<?php
foreach (['customers','odps','subscriptions','packages','invoices','payments','devices','tickets','mikrotik_routers','vouchers'] as $t) {
    echo $t . ": " . \Illuminate\Support\Facades\DB::table($t)->count() . PHP_EOL;
}