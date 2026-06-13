<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('support_tickets', 'role')) {
                $table->string('role')->default('driver');
            }

            if (!Schema::hasColumn('support_tickets', 'message')) {
                $table->text('message');
            }

            if (!Schema::hasColumn('support_tickets', 'admin_reply')) {
                $table->text('admin_reply')->nullable();
            }

            if (!Schema::hasColumn('support_tickets', 'replied_by')) {
                $table->string('replied_by', 32)->nullable();
            }

            if (!Schema::hasColumn('support_tickets', 'replied_at')) {
                $table->timestamp('replied_at')->nullable();
            }

            if (!Schema::hasColumn('support_tickets', 'closed_by')) {
                $table->string('closed_by', 32)->nullable();
            }

            if (!Schema::hasColumn('support_tickets', 'closed_at')) {
                $table->timestamp('closed_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $columns = ['role', 'message', 'admin_reply', 'replied_by', 'replied_at', 'closed_by', 'closed_at'];

            foreach ($columns as $column) {
                if (Schema::hasColumn('support_tickets', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
