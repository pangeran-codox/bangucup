<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\IsolirLog;
use App\Models\MikrotikRouter;
use App\Models\Subscription;
use App\Services\MikrotikService;
use Mockery\MockInterface;
use Tests\ApiTestCase;

class AutoIsolirTest extends ApiTestCase
{
    private MikrotikRouter $router;

    protected function setUp(): void
    {
        parent::setUp();

        $this->router = $this->makeRouter();
    }

    /** Buat $count langganan aktif dengan tagihan overdue 10 hari (melewati masa tenggang 3 hari). */
    private function overdueSubscriptions(int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $subscription = $this->makeSubscription(null, ['mikrotik_router_id' => $this->router->id]);
            $this->makeInvoice($subscription, [
                'status'   => 'overdue',
                'due_date' => today()->subDays(10)->toDateString(),
            ]);
        }
    }

    private function isolirCount(): int
    {
        return Subscription::where('status', 'isolir')->count();
    }

    public function test_dry_run_tidak_menyentuh_router_maupun_data(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('testConnection');
            $mock->shouldNotReceive('isolir');
        });
        $this->overdueSubscriptions(3);

        $this->artisan('billing:auto-isolir', ['--dry-run' => true])->assertExitCode(0);

        $this->assertSame(0, $this->isolirCount());
        $this->assertSame(0, IsolirLog::count());
    }

    public function test_semua_diisolir_dan_tercatat_bila_di_bawah_batas(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturn(true);
            $mock->shouldReceive('isolir')->twice()->andReturn(true);
        });
        $this->overdueSubscriptions(2);

        $this->artisan('billing:auto-isolir')->assertExitCode(0);

        $this->assertSame(2, $this->isolirCount());
        $this->assertSame(2, IsolirLog::where('action', 'isolir')->where('triggered_by', 'system')->count());
    }

    public function test_di_atas_batas_pengaman_seluruh_eksekusi_dibatalkan(): void
    {
        config(['billing.isolir_max_per_run' => 2]);

        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('testConnection');
            $mock->shouldNotReceive('isolir');
        });
        $this->overdueSubscriptions(3);

        $this->artisan('billing:auto-isolir')->assertExitCode(1);

        $this->assertSame(0, $this->isolirCount());
        $this->assertSame(0, IsolirLog::count());
    }

    public function test_limit_mengisolir_sebagian_walau_di_atas_batas(): void
    {
        config(['billing.isolir_max_per_run' => 2]);

        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturn(true);
            $mock->shouldReceive('isolir')->once()->andReturn(true);
        });
        $this->overdueSubscriptions(3);

        $this->artisan('billing:auto-isolir', ['--limit' => 1])->assertExitCode(0);

        $this->assertSame(1, $this->isolirCount());
        $this->assertSame(1, IsolirLog::count());
    }

    public function test_force_melewati_batas_pengaman(): void
    {
        config(['billing.isolir_max_per_run' => 1]);

        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturn(true);
            $mock->shouldReceive('isolir')->twice()->andReturn(true);
        });
        $this->overdueSubscriptions(2);

        $this->artisan('billing:auto-isolir', ['--force' => true])->assertExitCode(0);

        $this->assertSame(2, $this->isolirCount());
    }

    public function test_limit_tidak_valid_ditolak(): void
    {
        $this->overdueSubscriptions(1);

        $this->artisan('billing:auto-isolir', ['--limit' => 0])->assertExitCode(1);

        $this->assertSame(0, $this->isolirCount());
    }

    public function test_router_tidak_terjangkau_dilewati_tanpa_mengubah_data(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturn(false);
            $mock->shouldNotReceive('isolir');
        });
        $this->overdueSubscriptions(3);

        $this->artisan('billing:auto-isolir')->assertExitCode(0);

        $this->assertSame(0, $this->isolirCount());
        $this->assertSame(0, IsolirLog::count());
    }

    public function test_gagal_di_mikrotik_mengembalikan_status_gagal_dan_data_tetap_aktif(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturn(true);
            $mock->shouldReceive('isolir')->once()->andReturn(false);
        });
        $this->overdueSubscriptions(1);

        $this->artisan('billing:auto-isolir')->assertExitCode(1);

        $this->assertSame(0, $this->isolirCount());
        $this->assertSame(0, IsolirLog::count());
    }

    public function test_pemutus_menghentikan_router_yang_gagal_berturut_turut(): void
    {
        // 3 kegagalan beruntun pada satu router -> sisa langganan router itu dilewati.
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturn(true);
            $mock->shouldReceive('isolir')->times(3)->andReturn(false);
        });
        $this->overdueSubscriptions(6);

        $this->artisan('billing:auto-isolir', ['--force' => true])->assertExitCode(1);

        $this->assertSame(0, $this->isolirCount());
    }

    public function test_pelanggan_yang_baru_lunas_saat_proses_berjalan_dilewati(): void
    {
        // Simulasi: pelanggan membayar setelah daftar kandidat diambil, sebelum isolir dieksekusi.
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldReceive('testConnection')->once()->andReturnUsing(function () {
                Invoice::query()->update(['status' => 'paid', 'paid_at' => now()]);

                return true;
            });
            $mock->shouldNotReceive('isolir');
        });
        $this->overdueSubscriptions(2);

        $this->artisan('billing:auto-isolir')->assertExitCode(0);

        $this->assertSame(0, $this->isolirCount());
    }

    public function test_hanya_langganan_aktif_dengan_overdue_lewat_masa_tenggang_yang_dipilih(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('testConnection');
            $mock->shouldNotReceive('isolir');
        });

        // a) Tagihan belum overdue (unpaid)
        $a = $this->makeSubscription(null, ['mikrotik_router_id' => $this->router->id]);
        $this->makeInvoice($a, ['status' => 'unpaid', 'due_date' => today()->subDays(10)->toDateString()]);

        // b) Overdue tetapi masih dalam masa tenggang (kemarin)
        $b = $this->makeSubscription(null, ['mikrotik_router_id' => $this->router->id]);
        $this->makeInvoice($b, ['status' => 'overdue', 'due_date' => today()->subDay()->toDateString()]);

        // c) Sudah terisolir
        $c = $this->makeSubscription(null, ['mikrotik_router_id' => $this->router->id, 'status' => 'isolir']);
        $this->makeInvoice($c, ['status' => 'overdue', 'due_date' => today()->subDays(10)->toDateString()]);

        // d) Sudah berhenti berlangganan
        $d = $this->makeSubscription(null, ['mikrotik_router_id' => $this->router->id, 'status' => 'terminated']);
        $this->makeInvoice($d, ['status' => 'overdue', 'due_date' => today()->subDays(10)->toDateString()]);

        $this->artisan('billing:auto-isolir')->assertExitCode(0);

        $this->assertSame(0, IsolirLog::count());
    }

    public function test_langganan_tanpa_router_dilewati(): void
    {
        $this->mock(MikrotikService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('testConnection');
            $mock->shouldNotReceive('isolir');
        });

        $subscription = $this->makeSubscription();
        $this->makeInvoice($subscription, ['status' => 'overdue', 'due_date' => today()->subDays(10)->toDateString()]);

        $this->artisan('billing:auto-isolir')->assertExitCode(0);

        $this->assertSame('active', $subscription->fresh()->status);
    }
}
