<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Tests\ApiTestCase;

class IntegrityTest extends ApiTestCase
{
    // ── Langganan dibuat lewat API ────────────────────────────────────────────

    public function test_langganan_lewat_api_menyimpan_router_dan_memakai_nilai_bawaan(): void
    {
        $this->asRole('staff');
        $customer = $this->makeCustomer();
        $package  = $this->makePackage();
        $router   = $this->makeRouter();

        // Tanpa started_at dan billing_due_date: kolom keduanya NOT NULL di database.
        $this->postJson('/api/subscriptions', [
            'customer_id'        => $customer->id,
            'package_id'         => $package->id,
            'mikrotik_router_id' => $router->id,
            'pppoe_username'     => 'pelanggan01',
            'pppoe_password'     => 'rahasia-pppoe',
        ])->assertCreated();

        $this->assertDatabaseHas('subscriptions', [
            'pppoe_username'     => 'pelanggan01',
            'mikrotik_router_id' => $router->id,
            'billing_due_date'   => 1,
        ]);
        $this->assertNotNull(\App\Models\Subscription::where('pppoe_username', 'pelanggan01')->value('started_at'));
    }

    public function test_port_odp_yang_sudah_dipakai_ditolak(): void
    {
        $this->asRole('staff');
        $odp = $this->makeOdp(8);
        $this->makeSubscription(null, ['odp_id' => $odp->id, 'port_number' => 3]);

        $this->postJson('/api/subscriptions', [
            'customer_id'    => $this->makeCustomer()->id,
            'package_id'     => $this->makePackage()->id,
            'odp_id'         => $odp->id,
            'port_number'    => 3,
            'pppoe_username' => 'bentrok01',
            'pppoe_password' => 'x',
        ])->assertStatus(422)->assertJsonValidationErrors('port_number');
    }

    public function test_port_melebihi_kapasitas_odp_ditolak(): void
    {
        $this->asRole('staff');
        $odp = $this->makeOdp(8);

        $this->postJson('/api/subscriptions', [
            'customer_id'    => $this->makeCustomer()->id,
            'package_id'     => $this->makePackage()->id,
            'odp_id'         => $odp->id,
            'port_number'    => 9,
            'pppoe_username' => 'kelebihan01',
            'pppoe_password' => 'x',
        ])->assertStatus(422)->assertJsonValidationErrors('port_number');
    }

    public function test_port_milik_langganan_terminated_bisa_dipakai_lagi(): void
    {
        $this->asRole('staff');
        $odp = $this->makeOdp(8);
        $this->makeSubscription(null, ['odp_id' => $odp->id, 'port_number' => 3, 'status' => 'terminated']);

        $this->postJson('/api/subscriptions', [
            'customer_id'    => $this->makeCustomer()->id,
            'package_id'     => $this->makePackage()->id,
            'odp_id'         => $odp->id,
            'port_number'    => 3,
            'pppoe_username' => 'pakai-ulang01',
            'pppoe_password' => 'x',
        ])->assertCreated();
    }

    public function test_update_langganan_tidak_boleh_merebut_port_orang_lain(): void
    {
        $this->asRole('super_admin');
        $odp = $this->makeOdp(8);
        $this->makeSubscription(null, ['odp_id' => $odp->id, 'port_number' => 1]);
        $kedua = $this->makeSubscription(null, ['odp_id' => $odp->id, 'port_number' => 2]);

        $this->putJson("/api/subscriptions/{$kedua->id}", ['port_number' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('port_number');
    }

    public function test_status_isolir_tidak_bisa_diubah_lewat_update_biasa(): void
    {
        $this->asRole('super_admin');
        $subscription = $this->makeSubscription();

        $this->putJson("/api/subscriptions/{$subscription->id}", ['status' => 'isolir'])->assertStatus(422);

        $this->assertSame('active', $subscription->fresh()->status);
    }

    // ── Invoice lewat API ────────────────────────────────────────────────────

    public function test_invoice_bulanan_dobel_untuk_periode_sama_ditolak(): void
    {
        $this->asRole('staff');
        $subscription = $this->makeSubscription();

        $payload = [
            'customer_id'     => $subscription->customer_id,
            'subscription_id' => $subscription->id,
            'type'            => 'monthly',
            'period_month'    => '2026-10',          // format Y-m dari form dinormalkan jadi 2026-10-01
            'amount'          => 150000,
            'due_date'        => '2026-10-10',
        ];

        $this->postJson('/api/invoices', $payload)->assertCreated();
        $this->assertDatabaseHas('invoices', ['subscription_id' => $subscription->id, 'period_month' => '2026-10-01']);

        $this->postJson('/api/invoices', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('period_month');
    }

    public function test_invoice_dengan_diskon_melebihi_nominal_ditolak(): void
    {
        $this->asRole('staff');
        $subscription = $this->makeSubscription();

        $this->postJson('/api/invoices', [
            'customer_id'     => $subscription->customer_id,
            'subscription_id' => $subscription->id,
            'type'            => 'other',
            'amount'          => 1000,
            'discount_amount' => 2000,
            'due_date'        => '2026-10-10',
        ])->assertStatus(422)->assertJsonValidationErrors('discount_amount');
    }

    public function test_diskon_kosong_diperlakukan_nol_bukan_error(): void
    {
        $this->asRole('staff');
        $subscription = $this->makeSubscription();

        $this->postJson('/api/invoices', [
            'customer_id'     => $subscription->customer_id,
            'subscription_id' => $subscription->id,
            'type'            => 'other',
            'amount'          => 50000,
            'discount_amount' => null,
            'due_date'        => '2026-10-10',
        ])->assertCreated();

        $this->assertDatabaseHas('invoices', ['subscription_id' => $subscription->id, 'discount_amount' => 0]);
    }

    // ── Penghapusan data yang punya riwayat ──────────────────────────────────

    public function test_pelanggan_dengan_langganan_tidak_bisa_dihapus(): void
    {
        $this->asRole('super_admin');
        $customer = $this->makeCustomer();
        $this->makeSubscription($customer);

        $this->deleteJson("/api/customers/{$customer->id}")->assertStatus(422);

        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
    }

    public function test_pelanggan_tanpa_riwayat_boleh_dihapus(): void
    {
        $this->asRole('super_admin');
        $customer = $this->makeCustomer();

        $this->deleteJson("/api/customers/{$customer->id}")->assertNoContent();

        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_langganan_dengan_tagihan_tidak_bisa_dihapus(): void
    {
        $this->asRole('super_admin');
        $subscription = $this->makeSubscription();
        $this->makeInvoice($subscription);

        $this->deleteJson("/api/subscriptions/{$subscription->id}")->assertStatus(422);

        $this->assertDatabaseHas('subscriptions', ['id' => $subscription->id]);
    }

    public function test_invoice_yang_punya_pembayaran_tidak_bisa_dihapus(): void
    {
        $this->asRole('super_admin');
        $invoice = $this->makeInvoice($this->makeSubscription());
        Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'manual', 'amount' => 1000, 'status' => 'pending']);

        $this->deleteJson("/api/invoices/{$invoice->id}")->assertStatus(422);

        $this->assertDatabaseHas('invoices', ['id' => $invoice->id]);
    }

    // ── Aset ─────────────────────────────────────────────────────────────────

    public function test_mutasi_keluar_melebihi_stok_ditolak(): void
    {
        $this->asRole('teknisi');
        $asset = Asset::create(['name' => 'Kabel Drop', 'category' => 'kabel', 'stock_qty' => 2]);

        $this->postJson("/api/assets/{$asset->id}/movements", ['type' => 'out', 'qty' => 5])
            ->assertStatus(422)
            ->assertJsonValidationErrors('qty');

        $this->assertSame(2, $asset->fresh()->stock_qty);
        $this->assertDatabaseCount('asset_movements', 0);
    }

    public function test_mutasi_keluar_dalam_batas_stok_mengurangi_stok(): void
    {
        $this->asRole('teknisi');
        $asset = Asset::create(['name' => 'Konektor', 'category' => 'aksesoris', 'stock_qty' => 10]);

        $this->postJson("/api/assets/{$asset->id}/movements", ['type' => 'out', 'qty' => 4])->assertCreated();

        $this->assertSame(6, $asset->fresh()->stock_qty);
    }

    // ── Penjaga di level database (tetap berlaku walau aplikasi lupa mengecek) ──

    public function test_db_menolak_invoice_bulanan_dobel(): void
    {
        $subscription = $this->makeSubscription();
        $this->makeInvoice($subscription, ['period_month' => '2026-09-01']);

        $this->assertDatabaseRejects(
            fn () => $this->makeInvoice($subscription, ['period_month' => '2026-09-01']),
            'Invoice bulanan dobel seharusnya ditolak unique index.'
        );
    }

    public function test_db_mengizinkan_banyak_invoice_non_bulanan_atau_tanpa_periode(): void
    {
        $subscription = $this->makeSubscription();

        $this->makeInvoice($subscription, ['type' => 'installation']);
        $this->makeInvoice($subscription, ['type' => 'installation']);
        $this->makeInvoice($subscription, ['type' => 'monthly', 'period_month' => null]);
        $this->makeInvoice($subscription, ['type' => 'monthly', 'period_month' => null]);

        $this->assertSame(4, $subscription->invoices()->count());
    }

    public function test_db_menolak_diskon_lebih_besar_dari_nominal(): void
    {
        $subscription = $this->makeSubscription();

        $this->assertDatabaseRejects(
            fn () => $this->makeInvoice($subscription, ['amount' => 1000, 'discount_amount' => 2000]),
            'Diskon lebih besar dari nominal seharusnya ditolak CHECK.'
        );
    }

    public function test_db_menolak_pembayaran_nol_dan_transaksi_gateway_dobel(): void
    {
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->assertDatabaseRejects(
            fn () => Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'manual', 'amount' => 0, 'status' => 'pending']),
            'Pembayaran bernominal 0 seharusnya ditolak.'
        );

        Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'midtrans', 'gateway_transaction_id' => 'TRX-9', 'amount' => 1000, 'status' => 'pending']);

        $this->assertDatabaseRejects(
            fn () => Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'midtrans', 'gateway_transaction_id' => 'TRX-9', 'amount' => 1000, 'status' => 'pending']),
            'Transaksi gateway dobel seharusnya ditolak unique index.'
        );
    }

    public function test_db_mengizinkan_transaksi_gateway_yang_sama_di_gateway_berbeda(): void
    {
        $invoice = $this->makeInvoice($this->makeSubscription());

        Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'midtrans', 'gateway_transaction_id' => 'SAMA-1', 'amount' => 1000, 'status' => 'pending']);
        Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'xendit', 'gateway_transaction_id' => 'SAMA-1', 'amount' => 1000, 'status' => 'pending']);

        $this->assertSame(2, Payment::count());
    }

    public function test_db_menolak_stok_negatif_dan_qty_mutasi_nol(): void
    {
        $this->assertDatabaseRejects(
            fn () => Asset::create(['name' => 'Minus', 'category' => 'x', 'stock_qty' => -1]),
            'Stok negatif seharusnya ditolak CHECK.'
        );

        $asset = Asset::create(['name' => 'Ok', 'category' => 'x', 'stock_qty' => 5]);

        $this->assertDatabaseRejects(
            fn () => DB::table('asset_movements')->insert(['asset_id' => $asset->id, 'type' => 'in', 'qty' => 0]),
            'Mutasi aset dengan qty 0 seharusnya ditolak CHECK.'
        );
    }

    public function test_db_menolak_penghapusan_berantai_riwayat_keuangan(): void
    {
        $customer = $this->makeCustomer();
        $subscription = $this->makeSubscription($customer);
        $invoice = $this->makeInvoice($subscription);
        Payment::create(['invoice_id' => $invoice->id, 'gateway' => 'manual', 'amount' => 1000, 'status' => 'success']);

        $this->assertDatabaseRejects(fn () => $customer->delete(), 'Hapus pelanggan seharusnya ditolak FK RESTRICT.');
        $this->assertDatabaseRejects(fn () => $subscription->delete(), 'Hapus langganan seharusnya ditolak FK RESTRICT.');
        $this->assertDatabaseRejects(fn () => $invoice->delete(), 'Hapus invoice seharusnya ditolak FK RESTRICT.');

        $this->assertDatabaseCount('payments', 1);
    }
}
