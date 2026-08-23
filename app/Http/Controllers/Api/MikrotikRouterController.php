<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Router\StoreRouterRequest;
use App\Http\Resources\MikrotikRouterResource;
use App\Models\MikrotikRouter;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MikrotikRouterController extends ApiController
{
    public function __construct(private readonly MikrotikService $mikrotik) {}

    public function index(): JsonResponse
    {
        $routers = MikrotikRouter::orderBy('name')->get();

        return $this->success(MikrotikRouterResource::collection($routers));
    }

    public function store(StoreRouterRequest $request): JsonResponse
    {
        $router = MikrotikRouter::create($request->validated());

        return $this->created(new MikrotikRouterResource($router), 'Router berhasil ditambahkan');
    }

    public function show(MikrotikRouter $router): JsonResponse
    {
        return $this->success(new MikrotikRouterResource($router));
    }

    public function update(StoreRouterRequest $request, MikrotikRouter $router): JsonResponse
    {
        $router->update($request->validated());

        return $this->success(new MikrotikRouterResource($router), 'Router berhasil diperbarui');
    }

    public function destroy(MikrotikRouter $router): JsonResponse
    {
        $router->delete();

        return $this->noContent();
    }

    public function testConnection(MikrotikRouter $router): JsonResponse
    {
        $ok = $this->mikrotik->testConnection($router);

        return $ok
            ? $this->success(['status' => 'online'], 'Koneksi berhasil')
            : $this->error('Gagal terhubung ke router.', 502);
    }

    public function traffic(MikrotikRouter $router): JsonResponse
    {
        $traffic = $this->mikrotik->getInterfaceTraffic($router);

        return $this->success([
            'router_id' => $router->id,
            'router'    => $router->name,
            'timestamp' => now()->toIso8601String(),
            'interfaces'=> $traffic,
        ]);
    }
}
