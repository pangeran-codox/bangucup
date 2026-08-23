<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Subscription\StoreSubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\IsolirLog;
use App\Models\Subscription;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends ApiController
{
    public function __construct(private readonly MikrotikService $mikrotik) {}

    public function index(Request $request): JsonResponse
    {
        $query = Subscription::with(['customer', 'package']);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('router_id')) {
            $query->where('mikrotik_router_id', $request->router_id);
        }

        $subscriptions = $query
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => SubscriptionResource::collection($subscriptions),
            'meta' => [
                'current_page' => $subscriptions->currentPage(),
                'last_page'    => $subscriptions->lastPage(),
                'per_page'     => $subscriptions->perPage(),
                'total'        => $subscriptions->total(),
            ],
        ]);
    }

    public function store(StoreSubscriptionRequest $request): JsonResponse
    {
        $subscription = Subscription::create($request->validated());
        $subscription->load(['customer', 'package']);

        return $this->created(new SubscriptionResource($subscription), 'Langganan berhasil ditambahkan');
    }

    public function show(Subscription $subscription): JsonResponse
    {
        $subscription->load(['customer', 'package', 'odp']);

        return $this->success(new SubscriptionResource($subscription));
    }

    public function update(Request $request, Subscription $subscription): JsonResponse
    {
        $subscription->update($request->only([
            'package_id', 'odp_id', 'mikrotik_router_id',
            'port_number', 'pppoe_password', 'billing_due_date',
            'status', 'ended_at',
        ]));

        return $this->success(new SubscriptionResource($subscription), 'Langganan berhasil diperbarui');
    }

    public function destroy(Subscription $subscription): JsonResponse
    {
        $subscription->delete();

        return $this->noContent();
    }

    public function isolir(Request $request, Subscription $subscription): JsonResponse
    {
        if (! $subscription->mikrotikRouter) {
            return $this->error('Langganan tidak memiliki router yang dikonfigurasi.', 422);
        }

        $reason = $request->input('reason', 'Manual oleh admin');
        $ok     = $this->mikrotik->isolir($subscription->mikrotikRouter, $subscription->pppoe_username);

        if ($ok) {
            $subscription->update(['status' => 'isolir']);
            IsolirLog::create([
                'subscription_id' => $subscription->id,
                'action'          => 'isolir',
                'reason'          => $reason,
                'triggered_by'    => 'admin',
                'admin_id'        => $request->user()->id,
            ]);
        }

        return $ok
            ? $this->success(null, 'Langganan berhasil di-isolir')
            : $this->error('Gagal menghubungi MikroTik.', 502);
    }

    public function restore(Request $request, Subscription $subscription): JsonResponse
    {
        if (! $subscription->mikrotikRouter || ! $subscription->package) {
            return $this->error('Konfigurasi router atau paket tidak lengkap.', 422);
        }

        $profile = $subscription->package->mikrotik_profile_name;
        $ok      = $this->mikrotik->restore(
            $subscription->mikrotikRouter,
            $subscription->pppoe_username,
            $profile
        );

        if ($ok) {
            $subscription->update(['status' => 'active']);
            IsolirLog::create([
                'subscription_id' => $subscription->id,
                'action'          => 'restore',
                'reason'          => $request->input('reason', 'Manual oleh admin'),
                'triggered_by'    => 'admin',
                'admin_id'        => $request->user()->id,
            ]);
        }

        return $ok
            ? $this->success(null, 'Langganan berhasil dipulihkan')
            : $this->error('Gagal menghubungi MikroTik.', 502);
    }
}
