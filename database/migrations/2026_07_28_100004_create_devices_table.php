<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('genieacs_device_id', 150)->unique();
            $table->string('serial_number', 100)->nullable();
            $table->string('brand_model', 100)->nullable();
            $table->timestamp('last_inform_at')->nullable();
            $table->enum('last_status', ['online', 'offline', 'unknown'])->default('unknown');
            $table->decimal('rx_power', 6, 2)->nullable();
            $table->string('ssid', 100)->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
