<?php

namespace Tests;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\MikrotikRouter;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Dasar semua test API Bangucup.
 *
 * Memakai PostgreSQL sungguhan (migration memakai CHECK dan indeks parsial, jadi SQLite tidak cukup)
 * dan menolak berjalan di database yang namanya tidak berakhiran "_test".
 */
abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected const ROUTER_SECRET = 'rahasia-router-123';

    protected function setUp(): void
    {
        // Pengaman 1: cek variabel environment SEBELUM aplikasi menyala dan migrate:fresh berjalan.
        $database = (string) ($_ENV['DB_DATABASE'] ?? $_SERVER['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '');

        if (! str_ends_with($database, '_test')) {
            throw new \RuntimeException(
                "Test DIHENTIKAN: DB_DATABASE='{$database}' bukan database test (harus berakhiran _test). "
                .'Salin phpunit.pgsql.xml menjadi phpunit.xml dan buat database bangucup_test.'
            );
        }

        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** Pengaman 2: cek koneksi yang benar-benar dipakai sebelum database dihapus. */
    protected function beforeRefreshingDatabase()
    {
        $name = (string) DB::connection()->getDatabaseName();

        if (! str_ends_with($name, '_test')) {
            throw new \RuntimeException("Test DIHENTIKAN: koneksi database '{$name}' bukan database test.");
        }
    }

    // ── Autentikasi ──────────────────────────────────────────────────────────

    protected function userWithRole(string $role, array $attributes = []): User
    {
        $user = User::create($attributes + [
            'name'     => ucfirst($role).' Test',
            'email'    => $role.'-'.Str::lower(Str::random(6)).'@test.local',
            'password' => 'Rahasia12345',
        ]);

        $user->assignRole($role);

        return $user;
    }

    /** Pakai token Sanctum asli (bukan mock) agar ability dan kedaluwarsa teruji apa adanya. */
    protected function asUser(User $user, array $abilities = ['*']): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders([
            'Authorization' => 'Bearer '.$user->createToken('test', $abilities)->plainTextToken,
        ]);
    }

    protected function asRole(string $role): User
    {
        $user = $this->userWithRole($role);
        $this->asUser($user);

        return $user;
    }

    // ── Data uji ─────────────────────────────────────────────────────────────

    protected function makeCustomer(array $o = []): Customer
    {
        return Customer::create($o + [
            'name'    => 'Budi Test',
            'phone'   => '081234567890',
            'address' => 'Jl. Contoh No. 1',
            'status'  => 'active',
        ]);
    }

    protected function makePackage(array $o = []): Package
    {
        return Package::create($o + [
            'name'                  => 'Paket 10 Mbps',
            'speed_mbps'            => 10,
            'price'                 => 150000,
            'mikrotik_profile_name' => '10M',
        ]);
    }

    protected function makeRouter(array $o = []): MikrotikRouter
    {
        return MikrotikRouter::create($o + [
            'name'     => 'Router Test',
            'host'     => '10.255.255.1',
            'api_port' => 8728,
            'username' => 'api',
            'password' => self::ROUTER_SECRET,
        ]);
    }

    protected function makeOdp(int $ports = 8): Odp
    {
        return Odp::create(['name' => 'ODP-'.Str::upper(Str::random(4)), 'total_ports' => $ports]);
    }

    protected function makeSubscription(?Customer $customer = null, array $o = []): Subscription
    {
        $customer ??= $this->makeCustomer();

        return Subscription::create($o + [
            'customer_id'      => $customer->id,
            'package_id'       => $this->makePackage()->id,
            'pppoe_username'   => 'user'.Str::lower(Str::random(8)),
            'pppoe_password'   => 'pw-'.Str::random(6),
            'billing_due_date' => 1,
            'status'           => 'active',
            'started_at'       => today()->toDateString(),
        ]);
    }

    protected function makeInvoice(Subscription $subscription, array $o = []): Invoice
    {
        return Invoice::create($o + [
            'customer_id'     => $subscription->customer_id,
            'subscription_id' => $subscription->id,
            'type'            => 'monthly',
            'amount'          => 150000,
            'discount_amount' => 0,
            'due_date'        => today()->addDays(10)->toDateString(),
            'status'          => 'unpaid',
        ]);
    }

    // ── Pembantu assertion ───────────────────────────────────────────────────

    /**
     * Pastikan database menolak operasi ini. Dibungkus DB::transaction (savepoint) supaya
     * kegagalan satu statement tidak menggagalkan transaksi test di PostgreSQL.
     */
    protected function assertDatabaseRejects(callable $operation, string $message): void
    {
        try {
            DB::transaction($operation);
        } catch (QueryException) {
            $this->addToAssertionCount(1);

            return;
        }

        $this->fail($message);
    }
}
