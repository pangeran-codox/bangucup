<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Asset\StoreAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\AssetMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssetController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Asset::query();

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', "%{$request->search}%");
        }

        $assets = $query->orderBy('name')->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => AssetResource::collection($assets),
            'meta' => [
                'current_page' => $assets->currentPage(),
                'last_page'    => $assets->lastPage(),
                'per_page'     => $assets->perPage(),
                'total'        => $assets->total(),
            ],
        ]);
    }

    public function store(StoreAssetRequest $request): JsonResponse
    {
        $asset = Asset::create($request->validated());

        return $this->created(new AssetResource($asset), 'Aset berhasil ditambahkan');
    }

    public function show(Asset $asset): JsonResponse
    {
        return $this->success(new AssetResource($asset));
    }

    public function update(StoreAssetRequest $request, Asset $asset): JsonResponse
    {
        $asset->update($request->validated());

        return $this->success(new AssetResource($asset), 'Aset berhasil diperbarui');
    }

    public function destroy(Asset $asset): JsonResponse
    {
        $asset->delete();

        return $this->noContent();
    }

    public function addMovement(Request $request, Asset $asset): JsonResponse
    {
        $data = $request->validate([
            'type'            => ['required', Rule::in(['in', 'out'])],
            'qty'             => ['required', 'integer', 'min:1'],
            'subscription_id' => ['nullable', 'exists:subscriptions,id'],
            'note'            => ['nullable', 'string', 'max:255'],
        ]);

        if ($data['type'] === 'out' && $asset->stock_qty < $data['qty']) {
            return $this->error("Stok tidak cukup. Stok saat ini: {$asset->stock_qty} {$asset->unit}.", 422);
        }

        $movement = AssetMovement::create(array_merge($data, ['asset_id' => $asset->id]));
        $asset->refresh();

        return $this->created([
            'movement'  => $movement,
            'stock_qty' => $asset->stock_qty,
        ], 'Mutasi aset berhasil dicatat');
    }

    public function movements(Request $request, Asset $asset): JsonResponse
    {
        $movements = $asset->movements()
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => $movements->items(),
            'meta' => [
                'current_page' => $movements->currentPage(),
                'last_page'    => $movements->lastPage(),
                'per_page'     => $movements->perPage(),
                'total'        => $movements->total(),
            ],
        ]);
    }
}
