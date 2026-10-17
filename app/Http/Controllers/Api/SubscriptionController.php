<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Subscription\StoreSubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\IsolirLog;
use App\Models\Odp;
use App\Models\Subscription;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
            ->paginate(min($request->integer('per_page', 20), 100));

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
        $data = $request->validated();

        // Kolom ini NOT NULL di database, tetapi boleh kosong di form: beri nilai bawaan.
        $data['started_at']       = $data['started_at'] ?? today()->toDateString();
        $data['billing_due_date'] = $data['billing_due_date'] ?? 1;

        $subscription = Subscription::create($data);
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
        // Status isolir/active TIDAK boleh diubah lewat sini; pakai endpoint
        // isolir/restore supaya MikroTik dan log audit ikut diperbarui.
        // Dari sini hanya "terminated" yang diizinkan.
        $data = $request->validate([
            'package_id'         => ['sometimes', 'exists:packages,id'],
            'odp_id'             => ['sometimes', 'nullable', 'exists:odps,id'],
            'mikrotik_router_id' => ['sometimes', 'nullable', 'exists:mikrotik_routers,id'],
            'port_number'        => ['sometimes', 'nullable', 'integer', 'min:1'],
            'pppoe_password'     => ['sometimes', 'string', 'min:1', 'max:255'],
            'billing_due_date'   => ['sometimes', 'integer', 'min:1', 'max:31'],
            'status'             => ['sometimes', Rule::in(['terminated'])],
            'ended_at'           => ['sometimes', 'nullable', 'date'],
        ]);

        $odpId = array_key_exists('odp_id', $data) ? $data['odp_id'] : $subscription->odp_id;
        $port  = array_key_exists('port_number', $data) ? $data['port_number'] : $subscription->port_number;

        if ($odpId && $port && ($data['status'] ?? $subscription->status) !== 'terminated') {
            $odp = Odp::find($odpId);

            if ($odp && $port > $odp->total_ports) {
                throw ValidationException::withMessages([
                    'port_number' => "Port melebihi kapasitas ODP ({$odp->total_ports} port).",
                ]);
            }

            if (Subscription::portTaken((int) $odpId, (int) $port, $subscription->id)) {
                throw ValidationException::withMessages([
                    'port_number' => 'Port ODP ini sudah dipakai langganan lain.',
                ]);
            }
        }

        $subscription->update($data);

        return $this->success(new SubscriptionResource($subscription), 'Langganan berhasil diperbarui');
    }

    public function destroy(Subscription $subscription): JsonResponse
    {
        // Riwayat tagihan dan log isolir harus tetap ada. Hentikan layanan dengan status "terminated".
        if ($subscription->invoices()->exists() || $subscription->isolirLogs()->exists()) {
            return $this->error('Langganan punya riwayat tagihan/isolir dan tidak dapat dihapus. Ubah status menjadi terminated.', 422);
        }

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
