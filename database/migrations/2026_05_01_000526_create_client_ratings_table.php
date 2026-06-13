<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_ratings', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('ride_id', 32);
            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->string('user_id');
            $table->string('client_id', 32);
            $table->foreign('client_id')->references('id')->on('client_profiles')->onDelete('cascade');
            $table->tinyInteger('rating');
            $table->text('review')->nullable();
            $table->timestamps();

            $table->index(['client_id']);
            $table->index(['ride_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_ratings');
    }
};
