<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->enum('type', ['percentage', 'fixed']);
            $table->decimal('value', 12, 2);
            $table->enum('applies_to', ['installation', 'monthly', 'all'])->default('all');
            $table->date('valid_from');
            $table->date('valid_until');
            $table->unsignedInteger('max_usage')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
