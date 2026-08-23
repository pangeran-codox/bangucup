<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\MikrotikRouter;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    public function stats(): JsonResponse
    {
        $stats = Cache::remember('dashboard:stats', 60, function () {
            $now = now();

            $customerCounts = Customer::query()
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status')
                ->toArray();

            $revenueThisMonth = Invoice::query()
                ->where('status', 'paid')
                ->whereYear('paid_at', $now->year)
                ->whereMonth('paid_at', $now->month)
                ->sum(DB::raw('amount - discount_amount'));

            $invoiceCounts = Invoice::query()
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status')
                ->toArray();

            $routerTotal  = MikrotikRouter::where('is_active', true)->count();
            $subActive    = Subscription::where('status', 'active')->count();

            return [
                'total_customers'            => array_sum($customerCounts),
                'active_customers'           => (int) ($customerCounts['active'] ?? 0),
                'suspended_customers'        => (int) ($customerCounts['isolir'] ?? 0),
                'inactive_customers'         => (int) ($customerCounts['inactive'] ?? 0),
                'total_revenue_this_month'   => (float) $revenueThisMonth,
                'unpaid_invoices'            => (int) ($invoiceCounts['unpaid'] ?? 0),
                'overdue_invoices'           => (int) ($invoiceCounts['overdue'] ?? 0),
                'total_routers'              => $routerTotal,
                'online_routers'             => $routerTotal, // status realtime dari Go Collector (Phase 3)
                'active_subscriptions'       => $subActive,
            ];
        });

        return $this->success($stats);
    }
}
