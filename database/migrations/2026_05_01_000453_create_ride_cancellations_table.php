<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_cancellations', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('ride_id', 32);
            $table->foreign('ride_id')->references('id')->on('rides')->onDelete('cascade');
            $table->string('cancelled_by');
            $table->text('reason')->nullable();
            $table->timestamp('cancelled_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_cancellations');
    }
};
