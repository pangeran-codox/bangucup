<?php

namespace App\Filament\Widgets;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Subscription;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class BusinessStatsOverview extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $activeSubscriptions = Subscription::where('status', 'active')->count();
        $isolirCount = Subscription::where('status', 'isolir')->count();

        $revenueThisMonth = Payment::where('status', 'success')
            ->whereBetween('paid_at', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])
            ->sum('amount');

        $unpaidQuery = Invoice::whereIn('status', ['unpaid', 'overdue']);
        $unpaidCount = (clone $unpaidQuery)->count();
        $unpaidTotal = (clone $unpaidQuery)->sum('amount');

        return [
            Stat::make('Pelanggan Aktif', number_format($activeSubscriptions, 0, ',', '.'))
                ->icon('heroicon-o-users')
                ->color('success'),

            Stat::make('Pendapatan Bulan Ini', 'Rp '.number_format($revenueThisMonth, 0, ',', '.'))
                ->icon('heroicon-o-banknotes')
                ->color('warning'),

            Stat::make('Tagihan Belum Bayar', $unpaidCount.' tagihan')
                ->description('Rp '.number_format($unpaidTotal, 0, ',', '.'))
                ->icon('heroicon-o-exclamation-circle')
                ->color('danger'),

            Stat::make('Sedang Isolir', number_format($isolirCount, 0, ',', '.'))
                ->icon('heroicon-o-no-symbol')
                ->color($isolirCount > 0 ? 'danger' : 'gray'),
        ];
    }
}