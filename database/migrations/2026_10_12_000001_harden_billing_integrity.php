<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pengamanan integritas data billing (khusus PostgreSQL).
 *
 *  1. Riwayat keuangan tidak lagi ikut terhapus saat pelanggan/langganan/invoice dihapus (CASCADE -> RESTRICT).
 *  2. Unique index: invoice bulanan per langganan+periode, transaksi gateway, port ODP.
 *  3. CHECK constraint: nominal tidak negatif, diskon <= nominal, stok >= 0, rentang voucher.
 *  4. Index pada foreign key yang sering dipakai join/filter.
 *
 * Migration berjalan dalam satu transaksi: kalau ada data lama yang melanggar,
 * pesan error menjelaskan baris mana dan SEMUA perubahan dibatalkan.
 */
return new class extends Migration
{
    /** [tabel, kolom, tabel_referensi] untuk rantai data keuangan. */
    private array $financialForeignKeys = [
        ['subscriptions', 'customer_id',     'customers'],
        ['invoices',      'customer_id',     'customers'],
        ['invoices',      'subscription_id', 'subscriptions'],
        ['payments',      'invoice_id',      'invoices'],
        ['isolir_logs',   'subscription_id', 'subscriptions'],
    ];

    public function up(): void
    {
        $this->assertNoConflicts();

        // 1. CASCADE -> RESTRICT
        foreach ($this->financialForeignKeys as [$table, $column, $ref]) {
            $this->replaceForeignKey($table, $column, $ref, restrict: true);
        }

        // 2. Unique index parsial
        DB::statement("CREATE UNIQUE INDEX invoices_monthly_period_unique
            ON invoices (subscription_id, period_month)
            WHERE type = 'monthly' AND period_month IS NOT NULL");

        DB::statement('CREATE UNIQUE INDEX payments_gateway_txn_unique
            ON payments (gateway, gateway_transaction_id)
            WHERE gateway_transaction_id IS NOT NULL');

        DB::statement("CREATE UNIQUE INDEX subscriptions_odp_port_unique
            ON subscriptions (odp_id, port_number)
            WHERE odp_id IS NOT NULL AND port_number IS NOT NULL AND status <> 'terminated'");

        // 3. CHECK constraint
        DB::statement('ALTER TABLE invoices ADD CONSTRAINT invoices_amounts_check
            CHECK (amount >= 0 AND discount_amount >= 0 AND discount_amount <= amount)');
        DB::statement('ALTER TABLE payments ADD CONSTRAINT payments_amount_positive
            CHECK (amount > 0)');
        DB::statement('ALTER TABLE assets ADD CONSTRAINT assets_stock_non_negative
            CHECK (stock_qty >= 0)');
        DB::statement('ALTER TABLE asset_movements ADD CONSTRAINT asset_movements_qty_positive
            CHECK (qty > 0)');
        DB::statement('ALTER TABLE vouchers ADD CONSTRAINT vouchers_valid_range
            CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from)');
        DB::statement('ALTER TABLE vouchers ADD CONSTRAINT vouchers_usage_within_max
            CHECK (max_usage IS NULL OR used_count <= max_usage)');

        // 4. Index foreign key
        Schema::table('invoices', function (Blueprint $table) {
            $table->index('subscription_id');
            $table->index('customer_id');
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->index('invoice_id');
        });
        Schema::table('tickets', function (Blueprint $table) {
            $table->index('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', fn (Blueprint $t) => $t->dropIndex(['assigned_to']));
        Schema::table('payments', fn (Blueprint $t) => $t->dropIndex(['invoice_id']));
        Schema::table('invoices', function (Blueprint $t) {
            $t->dropIndex(['subscription_id']);
            $t->dropIndex(['customer_id']);
        });

        DB::statement('ALTER TABLE vouchers DROP CONSTRAINT vouchers_usage_within_max');
        DB::statement('ALTER TABLE vouchers DROP CONSTRAINT vouchers_valid_range');
        DB::statement('ALTER TABLE asset_movements DROP CONSTRAINT asset_movements_qty_positive');
        DB::statement('ALTER TABLE assets DROP CONSTRAINT assets_stock_non_negative');
        DB::statement('ALTER TABLE payments DROP CONSTRAINT payments_amount_positive');
        DB::statement('ALTER TABLE invoices DROP CONSTRAINT invoices_amounts_check');

        DB::statement('DROP INDEX subscriptions_odp_port_unique');
        DB::statement('DROP INDEX payments_gateway_txn_unique');
        DB::statement('DROP INDEX invoices_monthly_period_unique');

        foreach ($this->financialForeignKeys as [$table, $column, $ref]) {
            $this->replaceForeignKey($table, $column, $ref, restrict: false);
        }
    }

    private function replaceForeignKey(string $table, string $column, string $ref, bool $restrict): void
    {
        Schema::table($table, fn (Blueprint $t) => $t->dropForeign([$column]));

        Schema::table($table, function (Blueprint $t) use ($column, $ref, $restrict) {
            $fk = $t->foreign($column)->references('id')->on($ref);
            $restrict ? $fk->restrictOnDelete() : $fk->cascadeOnDelete();
        });
    }

    /** Hentikan migration dengan pesan jelas bila data lama melanggar aturan baru. */
    private function assertNoConflicts(): void
    {
        $checks = [
            'Invoice bulanan dobel (subscription_id + period_month)' => "SELECT subscription_id, period_month FROM invoices
                WHERE type = 'monthly' AND period_month IS NOT NULL
                GROUP BY 1, 2 HAVING COUNT(*) > 1",
            'gateway_transaction_id dobel di payments' => 'SELECT gateway, gateway_transaction_id FROM payments
                WHERE gateway_transaction_id IS NOT NULL
                GROUP BY 1, 2 HAVING COUNT(*) > 1',
            'Port ODP dipakai lebih dari satu langganan aktif' => "SELECT odp_id, port_number FROM subscriptions
                WHERE odp_id IS NOT NULL AND port_number IS NOT NULL AND status <> 'terminated'
                GROUP BY 1, 2 HAVING COUNT(*) > 1",
            'Invoice dengan nominal/diskon tidak valid' => 'SELECT id FROM invoices
                WHERE amount < 0 OR discount_amount < 0 OR discount_amount > amount',
            'Payment dengan nominal <= 0' => 'SELECT id FROM payments WHERE amount <= 0',
            'Aset dengan stok negatif' => 'SELECT id FROM assets WHERE stock_qty < 0',
            'Mutasi aset dengan qty <= 0' => 'SELECT id FROM asset_movements WHERE qty <= 0',
            'Voucher rentang tanggal terbalik' => 'SELECT id FROM vouchers
                WHERE valid_from IS NOT NULL AND valid_until IS NOT NULL AND valid_until < valid_from',
            'Voucher used_count melebihi max_usage' => 'SELECT id FROM vouchers
                WHERE max_usage IS NOT NULL AND used_count > max_usage',
        ];

        $problems = [];

        foreach ($checks as $label => $sql) {
            $rows = DB::select($sql);

            if ($rows !== []) {
                $sample = json_encode(array_slice($rows, 0, 5));
                $problems[] = '- '.$label.': '.count($rows).' baris, contoh '.$sample;
            }
        }

        if ($problems !== []) {
            throw new RuntimeException(
                "Migration dibatalkan karena data lama melanggar aturan baru. Bereskan dulu:\n".implode("\n", $problems)
            );
        }
    }
};
