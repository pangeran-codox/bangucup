<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['reminder', 'isolir_notice', 'payment_success']);
            $table->enum('channel', ['whatsapp', 'email']);
            $table->enum('status', ['sent', 'failed']);
            $table->timestamp('sent_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
