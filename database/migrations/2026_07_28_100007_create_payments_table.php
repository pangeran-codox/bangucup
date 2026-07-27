<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->enum('gateway', ['midtrans', 'xendit', 'manual', 'other']);
            $table->string('gateway_transaction_id', 150)->nullable();
            $table->string('method', 50)->nullable();
            $table->decimal('amount', 12, 2);
            $table->enum('status', ['pending', 'success', 'failed', 'expired'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
