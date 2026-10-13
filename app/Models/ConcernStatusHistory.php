<?php

namespace App\Models;

use App\Enums\ConcernStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class ConcernStatusHistory extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'old_status' => ConcernStatus::class,
            'new_status' => ConcernStatus::class,
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Status history is append-only.'));
        static::deleting(fn () => throw new LogicException('Status history is append-only.'));
    }

    public function concern(): BelongsTo
    {
        return $this->belongsTo(Concern::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
