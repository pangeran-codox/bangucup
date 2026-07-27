<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odps', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->decimal('location_lat', 10, 7)->nullable();
            $table->decimal('location_lng', 10, 7)->nullable();
            $table->unsignedInteger('total_ports')->default(8);
            $table->date('installed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odps');
    }
};
