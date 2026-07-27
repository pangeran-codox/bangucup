<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('voucher_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number', 50)->unique();
            $table->enum('type', ['installation', 'monthly', 'other'])->default('monthly');
            $table->date('period_month')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->date('due_date');
            $table->enum('status', ['unpaid', 'paid', 'overdue', 'cancelled'])->default('unpaid');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
