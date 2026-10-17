<?php

use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CableRouteController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\IsolirLogController;
use App\Http\Controllers\Api\MikrotikRouterController;
use App\Http\Controllers\Api\OdpController;
use App\Http\Controllers\Api\PackageController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RealtimeController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VoucherController;
use Illuminate\Support\Facades\Route;

// ─── Auth (publik) ────────────────────────────────────────────────
// Dibatasi 5 percobaan per menit per IP untuk menahan brute force.
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
});

// ─── Protected (Sanctum token) ────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Helper: daftarkan CRUD dengan permission per aksi (view/create/update/delete_{module}).
    $crud = function (string $uri, string $controller, string $module, array $only = ['index', 'show', 'store', 'update', 'destroy'], array $parameters = []) {
        $map = [
            'view'   => ['index', 'show'],
            'create' => ['store'],
            'update' => ['update'],
            'delete' => ['destroy'],
        ];

        foreach ($map as $action => $methods) {
            $methods = array_values(array_intersect($methods, $only));

            if ($methods === []) {
                continue;
            }

            Route::apiResource($uri, $controller)
                ->only($methods)
                ->parameters($parameters)
                ->middleware("permission:{$action}_{$module}");
        }
    };

    // Auth & profil (cukup login)
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me',      [AuthController::class, 'me']);
    });

    // Dashboard (cukup login)
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);

    // ── Endpoint internal untuk collector Go ──────────────────────
    // Tanpa middleware permission: akses dijaga oleh ability token `routers:collect`
    // (dicek di controller), bukan oleh role user.
    Route::get('internal/routers', [MikrotikRouterController::class, 'collector']);

    // Tiket WebSocket realtime (untuk halaman Monitoring)
    Route::post('realtime/ticket', [RealtimeController::class, 'ticket'])
        ->middleware('permission:view_routers');

    // Customers
    $crud('customers', CustomerController::class, 'customers');

    // Packages
    $crud('packages', PackageController::class, 'packages');

    // Subscriptions
    $crud('subscriptions', SubscriptionController::class, 'subscriptions');
    Route::post('subscriptions/{subscription}/isolir',  [SubscriptionController::class, 'isolir'])
        ->middleware('permission:update_subscriptions');
    Route::post('subscriptions/{subscription}/restore', [SubscriptionController::class, 'restore'])
        ->middleware('permission:update_subscriptions');

    // Invoices
    $crud('invoices', InvoiceController::class, 'invoices');
    Route::post('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid'])
        ->middleware('permission:update_invoices');

    // Payments
    $crud('payments', PaymentController::class, 'payments', ['index', 'show', 'store']);

    // Mikrotik Routers
    $crud('routers', MikrotikRouterController::class, 'routers');
    Route::post('routers/{router}/test-connection', [MikrotikRouterController::class, 'testConnection'])
        ->middleware('permission:update_routers');
    Route::get('routers/{router}/traffic', [MikrotikRouterController::class, 'traffic'])
        ->middleware('permission:view_routers');

    // Tickets
    $crud('tickets', TicketController::class, 'tickets');
    Route::post('tickets/{ticket}/replies', [TicketController::class, 'reply'])
        ->middleware('permission:update_tickets');

    // Assets
    $crud('assets', AssetController::class, 'assets');
    Route::post('assets/{asset}/movements', [AssetController::class, 'addMovement'])
        ->middleware('permission:update_assets');
    Route::get('assets/{asset}/movements',  [AssetController::class, 'movements'])
        ->middleware('permission:view_assets');

    // ODPs & jalur kabel (jalur kabel memakai permission odps)
    $crud('odps', OdpController::class, 'odps');
    $crud('cable-routes', CableRouteController::class, 'odps', ['index', 'show', 'store', 'update', 'destroy'], ['cable-routes' => 'cableRoute']);

    // Isolir Logs (read-only)
    Route::get('isolir-logs',             [IsolirLogController::class, 'index'])
        ->middleware('permission:view_subscriptions');
    Route::get('isolir-logs/{isolirLog}', [IsolirLogController::class, 'show'])
        ->middleware('permission:view_subscriptions');

    // Vouchers
    $crud('vouchers', VoucherController::class, 'vouchers');

    // Devices (CPE GenieACS)
    Route::get('devices',          [DeviceController::class, 'index'])->middleware('permission:view_devices');
    Route::get('devices/{device}', [DeviceController::class, 'show'])->middleware('permission:view_devices');
    Route::post('devices/{device}/refresh', [DeviceController::class, 'refresh'])
        ->middleware('permission:update_devices');

    // Users & Roles
    $crud('users', UserController::class, 'users');
    // Mengubah role = hak tertinggi, hanya yang punya permission update_roles (super_admin).
    Route::post('users/{user}/roles', [UserController::class, 'syncRoles'])
        ->middleware('permission:update_roles');
});
