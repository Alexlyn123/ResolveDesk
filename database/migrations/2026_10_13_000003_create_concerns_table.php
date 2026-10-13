<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One counter row per year, locked while a reference is issued.
        Schema::create('ticket_sequences', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('last_number')->default(0);
        });

        Schema::create('concerns', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('title', 150);
            $table->text('description');
            $table->string('priority', 20)->default('medium');
            $table->string('status', 30)->default('open');
            $table->text('resolution_note')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Every list and dashboard query is scoped by organization first.
            $table->index(['organization_id', 'status', 'created_at']);
            $table->index(['organization_id', 'created_at']);
            $table->index(['organization_id', 'updated_at']);
            $table->index(['organization_id', 'priority']);
            $table->index(['organization_id', 'due_at']);
            $table->index(['organization_id', 'resolved_at']);
            $table->index(['organization_id', 'created_by', 'status']);
            $table->index(['organization_id', 'assigned_to', 'status']);
            $table->index(['organization_id', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('concerns');
        Schema::dropIfExists('ticket_sequences');
    }
};
