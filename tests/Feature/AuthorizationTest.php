<?php

namespace Tests\Feature;

use Laravel\Sanctum\PersonalAccessToken;
use Tests\ApiTestCase;

class AuthorizationTest extends ApiTestCase
{
    public function test_tanpa_login_semua_endpoint_ditolak(): void
    {
        $this->getJson('/api/customers')->assertUnauthorized();
        $this->getJson('/api/users')->assertUnauthorized();
        $this->getJson('/api/internal/routers')->assertUnauthorized();
    }

    public function test_teknisi_tidak_bisa_membuat_user(): void
    {
        $this->asRole('teknisi');

        $this->postJson('/api/users', [
            'name' => 'Penyusup', 'email' => 'x@test.local', 'password' => 'Rahasia12345',
        ])->assertForbidden();
    }

    public function test_teknisi_tidak_bisa_naik_jabatan_jadi_super_admin(): void
    {
        $teknisi = $this->asRole('teknisi');

        $this->postJson("/api/users/{$teknisi->id}/roles", ['roles' => ['super_admin']])->assertForbidden();

        $this->assertFalse($teknisi->fresh()->hasRole('super_admin'));
    }

    public function test_teknisi_tidak_bisa_melihat_data_keuangan_tapi_bisa_tiket(): void
    {
        $this->asRole('teknisi');

        $this->getJson('/api/invoices')->assertForbidden();
        $this->getJson('/api/payments')->assertForbidden();
        $this->getJson('/api/tickets')->assertOk();
    }

    public function test_staff_tidak_bisa_menghapus_pelanggan_atau_mengelola_router(): void
    {
        $this->asRole('staff');
        $customer = $this->makeCustomer();

        $this->deleteJson("/api/customers/{$customer->id}")->assertForbidden();
        $this->getJson('/api/routers')->assertForbidden();
        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
    }

    public function test_staff_bisa_membaca_paket_dan_odp_untuk_form(): void
    {
        $this->asRole('staff');

        $this->getJson('/api/packages')->assertOk();
        $this->getJson('/api/odps')->assertOk();
    }

    public function test_admin_tidak_bisa_menetapkan_role_saat_membuat_user(): void
    {
        $this->asRole('admin');

        $this->postJson('/api/users', [
            'name' => 'Baru', 'email' => 'baru@test.local', 'password' => 'Rahasia12345', 'roles' => ['staff'],
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'baru@test.local']);
    }

    public function test_admin_tidak_bisa_mengubah_akun_super_admin(): void
    {
        $superAdmin = $this->userWithRole('super_admin');
        $this->asRole('admin');

        $this->putJson("/api/users/{$superAdmin->id}", ['name' => 'Diganti'])->assertForbidden();
        $this->deleteJson("/api/users/{$superAdmin->id}")->assertForbidden();

        $this->assertNotSame('Diganti', $superAdmin->fresh()->name);
    }

    public function test_super_admin_bisa_membuat_user_dengan_role(): void
    {
        $this->asRole('super_admin');

        $this->postJson('/api/users', [
            'name' => 'Staf Baru', 'email' => 'staf@test.local', 'password' => 'Rahasia12345', 'roles' => ['staff'],
        ])->assertCreated();

        $this->assertTrue(\App\Models\User::where('email', 'staf@test.local')->firstOrFail()->hasRole('staff'));
    }

    public function test_super_admin_terakhir_tidak_bisa_dicabut_rolenya(): void
    {
        $superAdmin = $this->asRole('super_admin');

        $this->postJson("/api/users/{$superAdmin->id}/roles", ['roles' => ['staff']])->assertStatus(422);

        $this->assertTrue($superAdmin->fresh()->hasRole('super_admin'));
    }

    public function test_login_dibatasi_lima_percobaan_per_menit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'tidak@ada.test', 'password' => 'salah'])
                ->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', ['email' => 'tidak@ada.test', 'password' => 'salah'])
            ->assertStatus(429);
    }

    public function test_token_login_memiliki_masa_berlaku(): void
    {
        $user = $this->userWithRole('staff', ['email' => 'staf@test.local']);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Rahasia12345'])
            ->assertOk();

        $token = PersonalAccessToken::where('tokenable_id', $user->id)->latest('id')->firstOrFail();

        $this->assertNotNull($token->expires_at, 'Token login harus punya expires_at.');
        $this->assertTrue($token->expires_at->isFuture());
    }

    public function test_password_router_tidak_pernah_ada_di_respons_api_biasa(): void
    {
        $router = $this->makeRouter();
        $this->asRole('super_admin');

        $this->getJson('/api/routers')->assertOk()
            ->assertDontSee(self::ROUTER_SECRET);

        $this->getJson("/api/routers/{$router->id}")->assertOk()
            ->assertDontSee(self::ROUTER_SECRET);
    }

    public function test_endpoint_internal_hanya_menerima_token_collector(): void
    {
        $this->makeRouter();

        // Token login biasa (ability *) milik super_admin ditolak.
        $superAdmin = $this->userWithRole('super_admin');
        $this->asUser($superAdmin)->getJson('/api/internal/routers')->assertForbidden();

        // Token dengan ability routers:collect diterima dan membawa password untuk collector.
        $collector = \App\Models\User::create([
            'name' => 'Collector', 'email' => 'collector@test.local', 'password' => 'Rahasia12345',
        ]);

        $this->asUser($collector, ['routers:collect'])
            ->getJson('/api/internal/routers')
            ->assertOk()
            ->assertSee(self::ROUTER_SECRET);
    }

    public function test_token_collector_tidak_bisa_memakai_endpoint_lain(): void
    {
        $collector = \App\Models\User::create([
            'name' => 'Collector', 'email' => 'collector@test.local', 'password' => 'Rahasia12345',
        ]);

        $this->asUser($collector, ['routers:collect']);

        $this->getJson('/api/customers')->assertForbidden();
        $this->getJson('/api/routers')->assertForbidden();
    }
}
