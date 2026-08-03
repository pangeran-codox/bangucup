<?php

namespace App\Filament\Widgets;

use App\Models\Device;
use App\Models\Ticket;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class TechnicalStatsOverview extends BaseWidget
{
    protected static ?int $sort = 2;

    protected function getStats(): array
    {
        $totalDevices = Device::count();
        $onlineDevices = Device::where('last_status', 'online')->count();
        $openTickets = Ticket::whereIn('status', ['open', 'in_progress'])->count();

        return [
            Stat::make('Device Online', "{$onlineDevices} / {$totalDevices}")
                ->icon('heroicon-o-wifi')
                ->color($totalDevices > 0 && $onlineDevices === $totalDevices ? 'success' : 'warning'),

            Stat::make('Tiket Terbuka', number_format($openTickets, 0, ',', '.'))
                ->icon('heroicon-o-ticket')
                ->color($openTickets > 0 ? 'warning' : 'success'),
        ];
    }
}