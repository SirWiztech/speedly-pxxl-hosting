<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_ratings', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('ride_id', 32);
            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->string('user_id');
            $table->string('driver_id', 32);
            $table->foreign('driver_id')->references('id')->on('driver_profiles')->onDelete('cascade');
            $table->tinyInteger('rating');
            $table->text('review')->nullable();
            $table->timestamps();

            $table->index(['driver_id']);
            $table->index(['ride_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_ratings');
    }
};
