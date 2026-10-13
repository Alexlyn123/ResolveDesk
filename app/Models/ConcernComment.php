<?php

namespace App\Models;

use App\Enums\CommentVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConcernComment extends Model
{
    protected $fillable = [
        'body',
    ];

    protected function casts(): array
    {
        return [
            'visibility' => CommentVisibility::class,
        ];
    }

    public function concern(): BelongsTo
    {
        return $this->belongsTo(Concern::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeVisibleTo(Builder $query, Membership $membership): void
    {
        if ($membership->isCustomer()) {
            $query->where('visibility', CommentVisibility::Public);
        }
    }
}
