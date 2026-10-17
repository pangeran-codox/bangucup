<?php

namespace App\Console\Commands;

use App\Models\IsolirLog;
use App\Models\Subscription;
use App\Services\MikrotikService;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoIsolir extends Command
{
    /** Setelah sekian kegagalan beruntun pada satu router, sisa langganan router itu dilewati. */
    private const MAX_CONSECUTIVE_FAILURES = 3;

    protected $signature = 'billing:auto-isolir
        {--dry-run : Hanya tampilkan yang akan di-isolir, tanpa mengubah apa pun}
        {--limit= : Isolir paling banyak N langganan pada eksekusi ini (untuk rollout bertahap)}
        {--force : Lewati batas pengaman jumlah isolir per eksekusi}';

    protected $description = 'Isolir otomatis langganan aktif yang punya invoice overdue melewati masa tenggang';

    public function handle(MikrotikService $mikrotik): int
    {
        $graceDays = (int) config('billing.isolir_grace_days', 3);
        $cutoff    = today()->subDays($graceDays);
        $dryRun    = (bool) $this->option('dry-run');
        $force     = (bool) $this->option('force');
        $limit     = $this->option('limit') !== null ? (int) $this->option('limit') : null;

        if ($limit !== null && $limit < 1) {
            $this->error('--limit harus berupa angka 1 atau lebih.');

            return self::FAILURE;
        }

        $candidates = $this->eligible($cutoff)->with('mikrotikRouter')->orderBy('id')->get();
        $total      = $candidates->count();

        if ($total === 0) {
            $this->info('Tidak ada langganan yang perlu di-isolir.');

            return self::SUCCESS;
        }

        // ── Pengaman jumlah ────────────────────────────────────────────────
        // Lonjakan kandidat biasanya tanda ada yang salah (scheduler lama mati, data tagihan
        // rusak, penyalaan pertama). Lebih baik berhenti dan minta konfirmasi manusia.
        $ceiling = (int) config('billing.isolir_max_per_run', 20);

        if ($limit === null && ! $force && $total > $ceiling) {
            $message = "Auto-isolir DIBATALKAN: {$total} kandidat melebihi batas pengaman {$ceiling}. "
                .'Periksa data tagihan, lalu jalankan manual dengan --limit=N (bertahap) atau --force.';

            if ($dryRun) {
                $this->warn("PERINGATAN: eksekusi nyata akan dibatalkan karena {$total} kandidat melebihi batas {$ceiling}.");
            } else {
                $this->error($message);
                Log::critical($message, ['kandidat' => $total, 'batas' => $ceiling]);

                return self::FAILURE;
            }
        }

        if ($limit !== null) {
            $candidates = $candidates->take($limit);
            $this->info("Dibatasi --limit={$limit} dari {$total} kandidat.");
        }

        // ── Cek koneksi tiap router sekali di awal ───────────────────────────
        // Router mati tidak boleh membuat proses menunggu timeout untuk setiap pelanggannya.
        $unreachable = [];

        if (! $dryRun) {
            foreach ($candidates->pluck('mikrotikRouter')->filter()->unique('id') as $router) {
                if (! $mikrotik->testConnection($router)) {
                    $unreachable[$router->id] = true;
                    $this->error("Router {$router->name} tidak terjangkau; langganannya dilewati.");
                    Log::error("Auto-isolir: router {$router->name} (#{$router->id}) tidak terjangkau.");
                }
            }
        }

        $isolir      = 0;
        $skip        = 0;
        $failed      = 0;
        $failStreak  = [];

        foreach ($candidates as $subscription) {
            $label  = "Subscription #{$subscription->id} ({$subscription->pppoe_username})";
            $router = $subscription->mikrotikRouter;

            if (! $router) {
                $this->warn("{$label}: router tidak dikonfigurasi, lewati.");
                $skip++;

                continue;
            }

            if ($dryRun) {
                $this->line("{$label}: akan di-isolir.");
                $isolir++;

                continue;
            }

            if (isset($unreachable[$router->id])) {
                $skip++;

                continue;
            }

            if (($failStreak[$router->id] ?? 0) >= self::MAX_CONSECUTIVE_FAILURES) {
                $this->warn("{$label}: dilewati, router {$router->name} gagal berturut-turut.");
                $skip++;

                continue;
            }

            // Cek ulang tepat sebelum memutus: pelanggan mungkin baru saja membayar
            // sejak daftar kandidat diambil.
            if (! $this->eligible($cutoff)->whereKey($subscription->id)->exists()) {
                $this->line("{$label}: sudah tidak memenuhi syarat (kemungkinan baru lunas), dilewati.");
                $skip++;

                continue;
            }

            if (! $mikrotik->isolir($router, $subscription->pppoe_username)) {
                $this->error("{$label}: gagal mengisolir di MikroTik.");
                Log::warning("Auto-isolir: gagal pada subscription #{$subscription->id} di router {$router->name}.");
                $failStreak[$router->id] = ($failStreak[$router->id] ?? 0) + 1;
                $failed++;

                continue;
            }

            $failStreak[$router->id] = 0;

            try {
                DB::transaction(function () use ($subscription, $graceDays) {
                    $subscription->update(['status' => 'isolir']);
                    IsolirLog::create([
                        'subscription_id' => $subscription->id,
                        'action'          => 'isolir',
                        'reason'          => "Auto-isolir: tagihan overdue lebih dari {$graceDays} hari masa tenggang",
                        'triggered_by'    => 'system',
                    ]);
                });
            } catch (\Throwable $e) {
                // MikroTik sudah terisolir tetapi database gagal diperbarui: perlu perhatian manusia.
                Log::critical("Auto-isolir: subscription #{$subscription->id} SUDAH diisolir di MikroTik tetapi gagal dicatat di database.", [
                    'error' => $e->getMessage(),
                ]);
                $this->error("{$label}: terisolir di MikroTik tapi gagal dicatat di database! Cek log.");
                $failed++;

                continue;
            }

            $this->info("{$label}: di-isolir.");
            $isolir++;
        }

        $verb    = $dryRun ? 'akan di-isolir (SIMULASI, tidak ada perubahan)' : 'di-isolir';
        $summary = "Selesai: {$isolir} {$verb}, {$skip} dilewati, {$failed} gagal.";
        $this->info($summary);
        Log::info('Auto-isolir '.($dryRun ? '(dry-run) ' : '').$summary);

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /** Langganan aktif yang punya invoice overdue melewati masa tenggang. */
    private function eligible(CarbonInterface $cutoff): Builder
    {
        return Subscription::query()
            ->where('status', 'active')
            ->whereHas('invoices', function ($q) use ($cutoff) {
                $q->where('status', 'overdue')
                    ->whereDate('due_date', '<=', $cutoff);
            });
    }
}
