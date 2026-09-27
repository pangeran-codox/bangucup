<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GenerateMonthlyInvoices extends Command
{
    protected $signature = 'billing:generate-invoices {--month= : Periode Y-m, default bulan berjalan}';

    protected $description = 'Generate invoice bulanan untuk semua langganan aktif (idempoten per periode)';

    public function handle(): int
    {
        $period = $this->option('month')
            ? Carbon::createFromFormat('Y-m', $this->option('month'))->startOfMonth()
            : now()->startOfMonth();

        $subscriptions = Subscription::query()
            ->with('package')
            ->whereIn('status', ['active', 'isolir'])
            ->whereDate('started_at', '<=', $period->copy()->endOfMonth())
            ->whereDoesntHave('invoices', function ($q) use ($period) {
                $q->where('type', 'monthly')
                    ->whereDate('period_month', $period);
            })
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info("Tidak ada invoice yang perlu dibuat untuk periode {$period->format('Y-m')}.");

            return self::SUCCESS;
        }

        $created = 0;

        foreach ($subscriptions as $subscription) {
            if (! $subscription->package) {
                $this->warn("Subscription #{$subscription->id}: paket tidak ditemukan, lewati.");

                continue;
            }

            $dueDay = min((int) $subscription->billing_due_date, $period->daysInMonth);

            Invoice::create([
                'customer_id'     => $subscription->customer_id,
                'subscription_id' => $subscription->id,
                'type'            => 'monthly',
                'period_month'    => $period,
                'amount'          => $subscription->package->price,
                'due_date'        => $period->copy()->setDay($dueDay),
                'status'          => 'unpaid',
            ]);

            $created++;
        }

        $this->info("Selesai: {$created} invoice dibuat untuk periode {$period->format('Y-m')}.");

        return self::SUCCESS;
    }
}
