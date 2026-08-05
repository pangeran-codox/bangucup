<?php
$tables = \Illuminate\Support\Facades\DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
foreach ($tables as $t) {
    echo "-- {$t->table_name}" . PHP_EOL;
    $cols = \Illuminate\Support\Facades\DB::select("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position", [$t->table_name]);
    foreach ($cols as $c) {
        echo "   {$c->column_name} | {$c->data_type} | nullable={$c->is_nullable}" . PHP_EOL;
    }
    echo PHP_EOL;
}