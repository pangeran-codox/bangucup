<?php

namespace App\Filament\Widgets;

use App\Models\Customer;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class NewCustomersChart extends ChartWidget
{
    protected static ?string $heading = 'Pelanggan Baru per Bulan';

    protected static ?int $sort = 4;

    protected function getData(): array
    {
        $months = collect(range(11, 0))->map(fn ($i) => Carbon::now()->subMonths($i)->startOfMonth());

        $counts = Customer::query()
            ->where('created_at', '>=', Carbon::now()->subMonths(11)->startOfMonth())
            ->select(DB::raw("to_char(created_at, 'YYYY-MM') as month"), DB::raw('COUNT(*) as total'))
            ->groupBy('month')
            ->pluck('total', 'month');

        $data = $months->map(fn ($month) => (int) ($counts[$month->format('Y-m')] ?? 0));

        return [
            'datasets' => [
                [
                    'label' => 'Pelanggan baru',
                    'data' => $data->values()->all(),
                    'backgroundColor' => '#f59e0b',
                ],
            ],
            'labels' => $months->map(fn ($month) => $month->translatedFormat('M Y'))->all(),
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}