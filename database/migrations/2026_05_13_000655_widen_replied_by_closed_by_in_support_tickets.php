<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->string('replied_by', 36)->nullable()->change();
            $table->string('closed_by', 36)->nullable()->change();
            $table->string('id', 36)->change();
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->string('replied_by', 32)->nullable()->change();
            $table->string('closed_by', 32)->nullable()->change();
            $table->string('id', 32)->change();
        });
    }
};
