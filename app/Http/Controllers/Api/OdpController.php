<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\OdpResource;
use App\Models\Odp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OdpController extends ApiController
{
    public function index(): JsonResponse
    {
        $odps = Odp::orderBy('name')->get();

        return $this->success(OdpResource::collection($odps));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:100'],
            'location_lat' => ['nullable', 'numeric'],
            'location_lng' => ['nullable', 'numeric'],
            'total_ports'  => ['nullable', 'integer', 'min:1'],
            'installed_at' => ['nullable', 'date'],
        ]);

        $odp = Odp::create($data);

        return $this->created(new OdpResource($odp), 'ODP berhasil ditambahkan');
    }

    public function show(Odp $odp): JsonResponse
    {
        return $this->success(new OdpResource($odp));
    }

    public function update(Request $request, Odp $odp): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['sometimes', 'string', 'max:100'],
            'location_lat' => ['nullable', 'numeric'],
            'location_lng' => ['nullable', 'numeric'],
            'total_ports'  => ['sometimes', 'integer', 'min:1'],
            'installed_at' => ['nullable', 'date'],
        ]);

        $odp->update($data);

        return $this->success(new OdpResource($odp), 'ODP berhasil diperbarui');
    }

    public function destroy(Odp $odp): JsonResponse
    {
        $odp->delete();

        return $this->noContent();
    }
}
