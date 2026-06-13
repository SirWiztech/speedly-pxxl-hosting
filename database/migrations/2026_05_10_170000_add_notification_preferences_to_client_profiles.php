<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->json('notification_preferences')->nullable()->after('membership_tier');
            $table->boolean('dark_mode')->default(false)->after('notification_preferences');
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn(['notification_preferences', 'dark_mode']);
        });
    }
};
