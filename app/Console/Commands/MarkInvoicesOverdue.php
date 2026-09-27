<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use Illuminate\Console\Command;

class MarkInvoicesOverdue extends Command
{
    protected $signature = 'billing:mark-overdue';

    protected $description = 'Tandai invoice unpaid yang sudah lewat jatuh tempo menjadi overdue';

    public function handle(): int
    {
        $count = Invoice::query()
            ->where('status', 'unpaid')
            ->whereDate('due_date', '<', today())
            ->update(['status' => 'overdue']);

        $this->info("Selesai: {$count} invoice ditandai overdue.");

        return self::SUCCESS;
    }
}
