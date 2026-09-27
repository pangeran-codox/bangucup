<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('genieacs:sync-devices')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// ─── Billing ──────────────────────────────────────────────────────
Schedule::command('billing:generate-invoices')
    ->dailyAt('00:05')
    ->withoutOverlapping();

Schedule::command('billing:mark-overdue')
    ->dailyAt('00:15')
    ->withoutOverlapping();

Schedule::command('billing:auto-isolir')
    ->dailyAt('01:00')
    ->withoutOverlapping();