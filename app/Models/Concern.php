<?php

namespace App\Models;

use App\Enums\ConcernPriority;
use App\Enums\ConcernStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Concern extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'category_id',
        'priority',
        'due_at',
    ];

    protected function casts(): array
    {
        return [
            'priority' => ConcernPriority::class,
            'status' => ConcernStatus::class,
            'due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ConcernComment::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(ConcernStatusHistory::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ConcernActivity::class);
    }

    public function isOverdue(): bool
    {
        return $this->due_at !== null && $this->status->isActive() && $this->due_at->isPast();
    }

    public function scopeVisibleTo(Builder $query, Membership $membership): void
    {
        $query->where('concerns.organization_id', $membership->organization_id);

        if ($membership->isCustomer()) {
            $query->where('concerns.created_by', $membership->user_id);
        }
    }

    public function scopeActive(Builder $query): void
    {
        $query->whereIn('concerns.status', ConcernStatus::activeValues());
    }

    public function scopeOverdue(Builder $query): void
    {
        $query->active()->whereNotNull('concerns.due_at')->where('concerns.due_at', '<', now());
    }
}
