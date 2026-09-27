<?php

namespace App\Console\Commands;

use App\Models\IsolirLog;
use App\Models\Subscription;
use App\Services\MikrotikService;
use Illuminate\Console\Command;

class AutoIsolir extends Command
{
    protected $signature = 'billing:auto-isolir {--dry-run : Hanya tampilkan yang akan di-isolir}';

    protected $description = 'Isolir otomatis langganan aktif yang punya invoice overdue melewati masa tenggang';

    public function handle(MikrotikService $mikrotik): int
    {
        $graceDays = (int) config('billing.isolir_grace_days', 3);
        $cutoff    = today()->subDays($graceDays);

        $subscriptions = Subscription::query()
            ->with('mikrotikRouter')
            ->where('status', 'active')
            ->whereHas('invoices', function ($q) use ($cutoff) {
                $q->where('status', 'overdue')
                    ->whereDate('due_date', '<=', $cutoff);
            })
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info('Tidak ada langganan yang perlu di-isolir.');

            return self::SUCCESS;
        }

        $isolir = 0;
        $skip   = 0;

        foreach ($subscriptions as $subscription) {
            $label = "Subscription #{$subscription->id} ({$subscription->pppoe_username})";

            if (! $subscription->mikrotikRouter) {
                $this->warn("{$label}: router tidak dikonfigurasi, lewati.");
                $skip++;

                continue;
            }

            if ($this->option('dry-run')) {
                $this->line("{$label}: akan di-isolir.");
                $isolir++;

                continue;
            }

            $ok = $mikrotik->isolir($subscription->mikrotikRouter, $subscription->pppoe_username);

            if (! $ok) {
                $this->error("{$label}: gagal menghubungi MikroTik.");
                $skip++;

                continue;
            }

            $subscription->update(['status' => 'isolir']);
            IsolirLog::create([
                'subscription_id' => $subscription->id,
                'action'          => 'isolir',
                'reason'          => "Auto-isolir: tagihan overdue lebih dari {$graceDays} hari masa tenggang",
                'triggered_by'    => 'system',
            ]);

            $this->info("{$label}: di-isolir.");
            $isolir++;
        }

        $this->info("Selesai: {$isolir} di-isolir, {$skip} dilewati.");

        return self::SUCCESS;
    }
}
