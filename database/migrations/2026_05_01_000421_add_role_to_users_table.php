<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->change();
            $table->string('full_name')->nullable()->after('name');
            $table->string('username')->nullable()->unique()->after('email');
            $table->string('phone_number')->nullable()->after('full_name');
            $table->string('role')->default('client')->after('phone_number');
            $table->string('profile_picture_url')->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('profile_picture_url');
            $table->boolean('is_verified')->default(false)->after('is_active');
            $table->timestamp('last_login')->nullable()->after('is_verified');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['full_name', 'username', 'phone_number', 'role', 'profile_picture_url', 'is_active', 'is_verified', 'last_login']);
            $table->string('name')->nullable(false)->change();
        });
    }
};
