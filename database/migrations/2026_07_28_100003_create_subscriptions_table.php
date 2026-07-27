<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('package_id')->constrained()->restrictOnDelete();
            $table->foreignId('odp_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('port_number')->nullable();
            $table->string('pppoe_username', 100)->unique();
            $table->string('pppoe_password', 255);
            $table->unsignedTinyInteger('billing_due_date')->default(1);
            $table->enum('status', ['active', 'isolir', 'terminated'])->default('active');
            $table->date('started_at');
            $table->date('ended_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
