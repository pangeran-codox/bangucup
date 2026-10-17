<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Router\StoreRouterRequest;
use App\Http\Resources\MikrotikRouterResource;
use App\Models\MikrotikRouter;
use App\Services\MikrotikService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

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
        $data = $request->validated();

        // Password kosong saat edit = jangan ubah password yang tersimpan.
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $router->update($data);

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

    /**
     * Daftar router lengkap dengan kredensial, KHUSUS untuk collector Go.
     *
     * Hanya token yang secara eksplisit punya ability `routers:collect` yang diterima.
     * Token login biasa (ability `*`) sengaja ditolak, jadi password router
     * tidak pernah sampai ke browser atau user biasa.
     */
    public function collector(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        abort_unless(
            $token instanceof PersonalAccessToken
                && in_array('routers:collect', $token->abilities ?? [], true),
            403,
            'Token tidak memiliki ability routers:collect.'
        );

        $routers = MikrotikRouter::where('is_active', true)
            ->orderBy('id')
            ->get()
            ->map(fn (MikrotikRouter $r) => [
                'id'        => $r->id,
                'name'      => $r->name,
                'host'      => $r->host,
                'api_port'  => $r->api_port,
                'username'  => $r->username,
                'password'  => $r->password, // didekripsi oleh cast `encrypted`
                'is_active' => true,
            ])
            ->values();

        return $this->success($routers);
    }
}
