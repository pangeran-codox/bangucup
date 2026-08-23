<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            // Composite index: filter is_active=true + sort by price dalam satu index scan
            $table->index(['is_active', 'price'], 'packages_is_active_price_idx');
        });
    }

    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->dropIndex('packages_is_active_price_idx');
        });
    }
};
