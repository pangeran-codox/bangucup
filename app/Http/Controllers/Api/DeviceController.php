<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\DeviceResource;
use App\Models\Device;
use App\Services\GenieAcsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends ApiController
{
    public function __construct(private readonly GenieAcsService $genieacs) {}

    public function index(Request $request): JsonResponse
    {
        $query = Device::with('customer');

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('status')) {
            $query->where('last_status', $request->status);
        }

        $devices = $query
            ->orderByDesc('last_inform_at')
            ->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => DeviceResource::collection($devices),
            'meta' => [
                'current_page' => $devices->currentPage(),
                'last_page'    => $devices->lastPage(),
                'per_page'     => $devices->perPage(),
                'total'        => $devices->total(),
            ],
        ]);
    }

    public function show(Device $device): JsonResponse
    {
        $device->load('customer');

        return $this->success(new DeviceResource($device));
    }

    public function refresh(Device $device): JsonResponse
    {
        try {
            $this->genieacs->refreshDevice($device->genieacs_device_id);

            return $this->success(null, 'Refresh perangkat berhasil dikirim ke GenieACS');
        } catch (\Throwable $e) {
            return $this->error('Gagal refresh perangkat: ' . $e->getMessage(), 502);
        }
    }
}
