<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\CableRouteResource;
use App\Models\CableRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CableRouteController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = CableRoute::with(['odp', 'customer']);

        if ($request->filled('odp_id')) {
            $query->where('odp_id', $request->odp_id);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $this->success(CableRouteResource::collection($query->orderBy('name')->get()));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['nullable', 'string', 'max:100'],
            'odp_id'      => ['nullable', 'exists:odps,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'path'        => ['required', 'array', 'min:2'],
            'path.*.lat'  => ['required', 'numeric', 'between:-90,90'],
            'path.*.lng'  => ['required', 'numeric', 'between:-180,180'],
            'status'      => ['sometimes', Rule::in(['active', 'damaged', 'planned'])],
        ]);

        $cableRoute = CableRoute::create($data);
        $cableRoute->load(['odp', 'customer']);

        return $this->created(new CableRouteResource($cableRoute), 'Rute kabel berhasil ditambahkan');
    }

    public function show(CableRoute $cableRoute): JsonResponse
    {
        $cableRoute->load(['odp', 'customer']);

        return $this->success(new CableRouteResource($cableRoute));
    }

    public function update(Request $request, CableRoute $cableRoute): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'nullable', 'string', 'max:100'],
            'odp_id'      => ['sometimes', 'nullable', 'exists:odps,id'],
            'customer_id' => ['sometimes', 'nullable', 'exists:customers,id'],
            'path'        => ['sometimes', 'array', 'min:2'],
            'path.*.lat'  => ['required', 'numeric', 'between:-90,90'],
            'path.*.lng'  => ['required', 'numeric', 'between:-180,180'],
            'status'      => ['sometimes', Rule::in(['active', 'damaged', 'planned'])],
        ]);

        $cableRoute->update($data);
        $cableRoute->load(['odp', 'customer']);

        return $this->success(new CableRouteResource($cableRoute), 'Rute kabel berhasil diperbarui');
    }

    public function destroy(CableRoute $cableRoute): JsonResponse
    {
        $cableRoute->delete();

        return $this->noContent();
    }
}
