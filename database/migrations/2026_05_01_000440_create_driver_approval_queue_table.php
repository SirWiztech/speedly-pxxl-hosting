<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_approval_queue', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('driver_id', 32);
            $table->foreign('driver_id')->references('id')->on('driver_profiles')->onDelete('cascade');
            $table->string('status')->default('pending');
            $table->string('reviewed_by', 32)->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_approval_queue');
    }
};
