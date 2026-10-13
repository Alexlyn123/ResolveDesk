<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('concern_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('concern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->text('body');
            $table->string('visibility', 20)->default('public');
            $table->timestamps();

            $table->index(['concern_id', 'visibility', 'created_at']);
        });

        // Append-only: the application never updates or deletes these rows.
        Schema::create('concern_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('concern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by')->constrained('users')->restrictOnDelete();
            $table->string('old_status', 30)->nullable();
            $table->string('new_status', 30);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['concern_id', 'created_at']);
        });

        // Audit trail for non-status changes: assignment, edits, deletion.
        Schema::create('concern_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('concern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 40);
            $table->json('properties')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['concern_id', 'created_at']);
            $table->index(['organization_id', 'created_at']);
        });

        // Standard Laravel database-notifications table.
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('concern_activities');
        Schema::dropIfExists('concern_status_histories');
        Schema::dropIfExists('concern_comments');
    }
};
