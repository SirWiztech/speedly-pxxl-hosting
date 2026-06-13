<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_declines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('ride_id');
            $table->uuid('driver_id');
            $table->boolean('auto_decline')->default(false);
            $table->integer('response_time_seconds')->default(0);
            $table->timestamps();

            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->foreign('driver_id')->references('id')->on('driver_profiles')->onDelete('cascade');
            $table->index(['driver_id', 'ride_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_declines');
    }
};
