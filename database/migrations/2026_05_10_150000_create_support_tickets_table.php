<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('role')->default('driver');
            $table->string('category');
            $table->string('subject');
            $table->text('message');
            $table->string('priority')->default('normal');
            $table->string('status')->default('open');
            $table->string('ticket_number')->unique();
            $table->text('admin_reply')->nullable();
            $table->string('replied_by', 32)->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->string('closed_by', 32)->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
