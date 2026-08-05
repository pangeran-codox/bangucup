<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cable_routes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->nullable();
            $table->foreignId('odp_id')->nullable()->constrained('odps')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->json('path'); // array titik [{lat, lng}, {lat, lng}, ...] hasil gambar polyline
            $table->string('status', 20)->default('active'); // active, damaged, planned
            $table->timestamps();

            $table->index('odp_id');
            $table->index('customer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cable_routes');
    }
};