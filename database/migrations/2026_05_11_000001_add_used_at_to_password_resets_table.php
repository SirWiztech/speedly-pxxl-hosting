<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('password_resets', function (Blueprint $table) {
            if (!Schema::hasColumn('password_resets', 'used_at')) {
                $table->timestamp('used_at')->nullable()->after('expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('password_resets', function (Blueprint $table) {
            if (Schema::hasColumn('password_resets', 'used_at')) {
                $table->dropColumn('used_at');
            }
        });
    }
};
