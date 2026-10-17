<?php

namespace Tests\Feature;

use App\Models\IsolirLog;
use App\Models\Payment;
use App\Services\MikrotikService;
use Mockery\MockInterface;
use Tests\ApiTestCase;

class PaymentTest extends ApiTestCase
{
    private function payload(int $invoiceId, array $o = []): array
    {
        return $o + [
            'invoice_id' => $invoiceId,
            'gateway'    => 'manual',
            'amount'     => 150000,
            'status'     => 'success',
        ];
    }

    public function test_pembayaran_manual_sukses_melunasi_invoice(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->postJson('/api/payments', $this->payload($invoice->id))->assertCreated();

        $invoice->refresh();
        $this->assertSame('paid', $invoice->status);
        $this->assertNotNull($invoice->paid_at);
        $this->assertDatabaseHas('payments', ['invoice_id' => $invoice->id, 'gateway' => 'manual', 'status' => 'success']);
    }

    public function test_format_paid_at_tanggal_diterima_tanpa_error(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->postJson('/api/payments', $this->payload($invoice->id, [
            'paid_at' => now()->subDay()->format('Y-m-d H:i:s'),
        ]))->assertCreated();
    }

    public function test_nominal_kurang_ditolak_dan_invoice_tetap_belum_lunas(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->postJson('/api/payments', $this->payload($invoice->id, ['amount' => 1000]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('amount');

        $this->assertSame('unpaid', $invoice->fresh()->status);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_diskon_dihitung_pada_nominal_yang_harus_dibayar(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription(), ['amount' => 150000, 'discount_amount' => 50000]);

        $this->postJson('/api/payments', $this->payload($invoice->id, ['amount' => 100000]))->assertCreated();

        $this->assertSame('paid', $invoice->fresh()->status);
    }

    public function test_invoice_lunas_tidak_bisa_dibayar_lagi(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription(), ['status' => 'paid', 'paid_at' => now()]);

        $this->postJson('/api/payments', $this->payload($invoice->id))
            ->assertStatus(422)
            ->assertJsonValidationErrors('invoice_id');
    }

    public function test_invoice_dibatalkan_tidak_bisa_dibayar(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription(), ['status' => 'cancelled']);

        $this->postJson('/api/payments', $this->payload($invoice->id))->assertStatus(422);

        $this->assertSame('cancelled', $invoice->fresh()->status);
    }

    public function test_pembayaran_gateway_tidak_bisa_dipalsukan_lewat_api(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->postJson('/api/payments', $this->payload($invoice->id, ['gateway' => 'midtrans']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('gateway');

        $this->assertSame('unpaid', $invoice->fresh()->status);
    }

    public function test_transaction_id_dobel_ditolak(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $pending = $this->payload($invoice->id, ['status' => 'pending', 'gateway_transaction_id' => 'TRX-1']);

        $this->postJson('/api/payments', $pending)->assertCreated();
        $this->postJson('/api/payments', $pending)
            ->assertStatus(422)
            ->assertJsonValidationErrors('gateway_transaction_id');
    }

    public function test_dua_pembayaran_sukses_untuk_satu_invoice_tidak_mungkin(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->postJson('/api/payments', $this->payload($invoice->id))->assertCreated();
        $this->postJson('/api/payments', $this->payload($invoice->id))->assertStatus(422);

        $this->assertSame(1, Payment::where('invoice_id', $invoice->id)->count());
    }

    public function test_mark_paid_mencatat_pembayaran_manual(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription(), ['amount' => 150000, 'discount_amount' => 25000]);

        $this->postJson("/api/invoices/{$invoice->id}/mark-paid")->assertOk();

        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertDatabaseHas('payments', [
            'invoice_id' => $invoice->id,
            'gateway'    => 'manual',
            'status'     => 'success',
            'amount'     => 125000,
        ]);

        // Panggilan kedua ditolak, tidak membuat pembayaran ganda.
        $this->postJson("/api/invoices/{$invoice->id}/mark-paid")->assertStatus(422);
        $this->assertSame(1, Payment::where('invoice_id', $invoice->id)->count());
    }

    public function test_mark_paid_ditolak_untuk_invoice_dibatalkan(): void
    {
        $this->asRole('staff');
        $invoice = $this->makeInvoice($this->makeSubscription(), ['status' => 'cancelled']);

        $this->postJson("/api/invoices/{$invoice->id}/mark-paid")->assertStatus(422);

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_lunas_memulihkan_langganan_yang_terisolir(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('restore')
                ->once()
                ->withArgs(fn ($router, $username, $profile) => $profile === '10M')
                ->andReturn(true);
        });

        $this->asRole('staff');
        $subscription = $this->makeSubscription(null, [
            'status'             => 'isolir',
            'mikrotik_router_id' => $this->makeRouter()->id,
        ]);
        $invoice = $this->makeInvoice($subscription, ['status' => 'overdue']);

        $this->postJson("/api/invoices/{$invoice->id}/mark-paid")->assertOk();

        $this->assertSame('active', $subscription->fresh()->status);
        $this->assertDatabaseHas('isolir_logs', ['subscription_id' => $subscription->id, 'action' => 'restore']);
    }

    public function test_langganan_tidak_dipulihkan_selama_masih_ada_tagihan_lain(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('restore');
        });

        $this->asRole('staff');
        $subscription = $this->makeSubscription(null, [
            'status'             => 'isolir',
            'mikrotik_router_id' => $this->makeRouter()->id,
        ]);
        $this->makeInvoice($subscription, ['status' => 'overdue']);
        $lunas = $this->makeInvoice($subscription, ['status' => 'overdue']);

        $this->postJson("/api/invoices/{$lunas->id}/mark-paid")->assertOk();

        $this->assertSame('isolir', $subscription->fresh()->status);
        $this->assertSame(0, IsolirLog::count());
    }

    public function test_invoice_lunas_tidak_bisa_diubah_atau_dihapus(): void
    {
        $this->asRole('super_admin');
        $invoice = $this->makeInvoice($this->makeSubscription());

        $this->postJson("/api/invoices/{$invoice->id}/mark-paid")->assertOk();

        $this->putJson("/api/invoices/{$invoice->id}", ['amount' => 1])->assertStatus(422);
        $this->deleteJson("/api/invoices/{$invoice->id}")->assertStatus(422);

        $this->assertSame('150000.00', $invoice->fresh()->amount);
    }
}
