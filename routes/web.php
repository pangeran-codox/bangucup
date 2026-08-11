<?php

use App\Models\Package;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'packages' => Package::query()
            ->where('is_active', true)
            ->orderBy('price')
            ->get(['id', 'name', 'speed_mbps', 'price'])
            ->map(fn (Package $package) => [
                'id' => $package->id,
                'name' => $package->name,
                'speed_mbps' => $package->speed_mbps,
                'price' => (float) $package->price,
            ]),
    ]);
});