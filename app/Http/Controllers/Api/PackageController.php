<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Package\StorePackageRequest;
use App\Http\Resources\PackageResource;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackageController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Package::query();

        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }

        $packages = $query->orderBy('price')->get();

        return $this->success(PackageResource::collection($packages));
    }

    public function store(StorePackageRequest $request): JsonResponse
    {
        $package = Package::create($request->validated());

        return $this->created(new PackageResource($package), 'Paket berhasil ditambahkan');
    }

    public function show(Package $package): JsonResponse
    {
        return $this->success(new PackageResource($package));
    }

    public function update(StorePackageRequest $request, Package $package): JsonResponse
    {
        $package->update($request->validated());

        return $this->success(new PackageResource($package), 'Paket berhasil diperbarui');
    }

    public function destroy(Package $package): JsonResponse
    {
        $package->delete();

        return $this->noContent();
    }
}
