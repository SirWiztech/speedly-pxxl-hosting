<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rides', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('ride_number')->unique();
            $table->string('client_id', 32);
            $table->foreign('client_id')->references('id')->on('client_profiles')->onDelete('cascade');
            $table->string('driver_id', 32)->nullable();
            $table->foreign('driver_id')->references('id')->on('driver_profiles')->onDelete('set null');
            $table->string('pickup_address');
            $table->decimal('pickup_latitude', 10, 8);
            $table->decimal('pickup_longitude', 11, 8);
            $table->string('pickup_place_id')->nullable();
            $table->string('destination_address');
            $table->decimal('destination_latitude', 10, 8);
            $table->decimal('destination_longitude', 11, 8);
            $table->string('dest_place_id')->nullable();
            $table->string('ride_type')->default('economy');
            $table->decimal('distance_km', 8, 2)->default(0);
            $table->decimal('total_fare', 10, 2)->default(0);
            $table->decimal('platform_commission', 10, 2)->default(0);
            $table->decimal('driver_payout', 10, 2)->default(0);
            $table->string('status')->default('pending');
            $table->string('payment_status')->default('pending');
            $table->string('payment_method')->nullable();
            $table->tinyInteger('client_rating')->nullable();
            $table->text('client_review')->nullable();
            $table->tinyInteger('driver_rating')->nullable();
            $table->text('driver_review')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['driver_id', 'status']);
            $table->index(['client_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rides');
    }
};
