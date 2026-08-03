<?php

namespace App\Filament\Widgets;

use App\Models\Payment;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RevenueChart extends ChartWidget
{
    protected ?string $heading = 'Pendapatan 12 Bulan Terakhir';

    protected static ?int $sort = 3;

    protected function getData(): array
    {
        $months = collect(range(11, 0))->map(fn ($i) => Carbon::now()->subMonths($i)->startOfMonth());

        $revenues = Payment::query()
            ->where('status', 'success')
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', Carbon::now()->subMonths(11)->startOfMonth())
            ->select(DB::raw("to_char(paid_at, 'YYYY-MM') as month"), DB::raw('SUM(amount) as total'))
            ->groupBy('month')
            ->pluck('total', 'month');

        $data = $months->map(fn ($month) => (float) ($revenues[$month->format('Y-m')] ?? 0));

        return [
            'datasets' => [
                [
                    'label' => 'Pendapatan (Rp)',
                    'data' => $data->values()->all(),
                    'borderColor' => '#f59e0b',
                    'backgroundColor' => 'rgba(245, 158, 11, 0.2)',
                ],
            ],
            'labels' => $months->map(fn ($month) => $month->translatedFormat('M Y'))->all(),
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}