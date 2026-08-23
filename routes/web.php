<?php

use Illuminate\Support\Facades\Route;

// Web routes kosong — semua akses melalui API (routes/api.php)
// Frontend React di-serve terpisah via Vite / Nginx
Route::get('/', fn () => response()->json(['app' => config('app.name'), 'version' => '2.0']));
