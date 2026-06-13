<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_kyc_documents', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('driver_id', 32);
            $table->foreign('driver_id')->references('id')->on('driver_profiles')->onDelete('cascade');
            $table->string('document_type');
            $table->string('document_url');
            $table->string('verification_status')->default('pending');
            $table->string('verified_by', 32)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_kyc_documents');
    }
};
