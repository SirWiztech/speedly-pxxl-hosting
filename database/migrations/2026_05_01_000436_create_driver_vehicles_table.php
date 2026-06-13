<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_vehicles', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('driver_id', 32);
            $table->foreign('driver_id')->references('id')->on('driver_profiles')->onDelete('cascade');
            $table->string('vehicle_type')->default('economy');
            $table->string('vehicle_model')->nullable();
            $table->string('vehicle_color')->nullable();
            $table->string('plate_number')->nullable();
            $table->string('vehicle_year')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_vehicles');
    }
};
