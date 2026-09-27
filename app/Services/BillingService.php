<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\IsolirLog;
use Illuminate\Support\Facades\Log;

class BillingService
{
    public function __construct(private readonly MikrotikService $mikrotik) {}

    /**
     * Restore langganan yang berstatus isolir bila semua tagihannya sudah lunas.
     */
    public function restoreIfSettled(Invoice $invoice): bool
    {
        $subscription = $invoice->subscription;

        if (! $subscription || $subscription->status !== 'isolir') {
            return false;
        }

        $hasUnsettled = $subscription->invoices()
            ->whereIn('status', ['unpaid', 'overdue'])
            ->whereKeyNot($invoice->id)
            ->exists();

        if ($hasUnsettled) {
            return false;
        }

        if (! $subscription->mikrotikRouter || ! $subscription->package) {
            Log::warning("Auto-restore subscription #{$subscription->id}: router/paket tidak lengkap.");

            return false;
        }

        $ok = $this->mikrotik->restore(
            $subscription->mikrotikRouter,
            $subscription->pppoe_username,
            $subscription->package->mikrotik_profile_name
        );

        if (! $ok) {
            Log::error("Auto-restore subscription #{$subscription->id}: gagal menghubungi MikroTik.");

            return false;
        }

        $subscription->update(['status' => 'active']);
        IsolirLog::create([
            'subscription_id' => $subscription->id,
            'action'          => 'restore',
            'reason'          => 'Auto-restore: semua tagihan lunas',
            'triggered_by'    => 'system',
        ]);

        return true;
    }
}
