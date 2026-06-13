<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_resets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('token');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['user_id']);
            $table->index(['token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_resets');
    }
};
