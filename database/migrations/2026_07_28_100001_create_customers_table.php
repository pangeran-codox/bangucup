<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();
            $table->text('address');
            $table->decimal('coordinate_lat', 10, 7)->nullable();
            $table->decimal('coordinate_lng', 10, 7)->nullable();
            $table->enum('status', ['active', 'isolir', 'inactive', 'pending'])->default('pending');
            $table->date('joined_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
