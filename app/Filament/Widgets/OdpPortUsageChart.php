<?php

namespace App\Filament\Widgets;

use App\Models\Odp;
use Filament\Widgets\ChartWidget;

class OdpPortUsageChart extends ChartWidget
{
    protected ?string $heading = 'Pemakaian Port per ODP';

    protected static ?int $sort = 5;

    protected function getData(): array
    {
        $odps = Odp::withCount(['subscriptions as used_ports' => function ($query) {
            $query->where('status', 'active');
        }])->orderByDesc('used_ports')->limit(10)->get();

        return [
            'datasets' => [
                [
                    'label' => 'Port terpakai',
                    'data' => $odps->pluck('used_ports')->all(),
                    'backgroundColor' => '#3b82f6',
                ],
                [
                    'label' => 'Total port',
                    'data' => $odps->pluck('total_ports')->all(),
                    'backgroundColor' => 'rgba(148, 163, 184, 0.3)',
                ],
            ],
            'labels' => $odps->pluck('name')->all(),
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}