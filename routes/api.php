<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\PackageController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\MikrotikRouterController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\OdpController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\UserController;

// ─── Auth (publik) ────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// ─── Protected (Sanctum token) ────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me',      [AuthController::class, 'me']);
    });

    // Dashboard
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);

    // Customers
    Route::apiResource('customers', CustomerController::class);

    // Packages
    Route::apiResource('packages', PackageController::class);

    // Subscriptions
    Route::apiResource('subscriptions', SubscriptionController::class);
    Route::post('subscriptions/{subscription}/isolir',  [SubscriptionController::class, 'isolir']);
    Route::post('subscriptions/{subscription}/restore', [SubscriptionController::class, 'restore']);

    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid']);

    // Payments
    Route::apiResource('payments', PaymentController::class)->only(['index', 'show', 'store']);

    // Mikrotik Routers
    Route::apiResource('routers', MikrotikRouterController::class);
    Route::post('routers/{router}/test-connection', [MikrotikRouterController::class, 'testConnection']);
    Route::get('routers/{router}/traffic',          [MikrotikRouterController::class, 'traffic']);

    // Tickets
    Route::apiResource('tickets', TicketController::class);
    Route::post('tickets/{ticket}/replies', [TicketController::class, 'reply']);

    // Assets
    Route::apiResource('assets', AssetController::class);
    Route::post('assets/{asset}/movements', [AssetController::class, 'addMovement']);
    Route::get('assets/{asset}/movements',  [AssetController::class, 'movements']);

    // ODPs
    Route::apiResource('odps', OdpController::class);

    // Vouchers
    Route::apiResource('vouchers', VoucherController::class);

    // Devices (CPE GenieACS)
    Route::get('devices',          [DeviceController::class, 'index']);
    Route::get('devices/{device}', [DeviceController::class, 'show']);
    Route::post('devices/{device}/refresh', [DeviceController::class, 'refresh']);

    // Users & Roles
    Route::apiResource('users', UserController::class);
    Route::post('users/{user}/roles', [UserController::class, 'syncRoles']);
});
