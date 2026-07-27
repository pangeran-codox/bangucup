<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('isolir_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
            $table->enum('action', ['isolir', 'restore']);
            $table->string('reason', 255)->nullable();
            $table->enum('triggered_by', ['system', 'admin']);
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('isolir_logs');
    }
};
