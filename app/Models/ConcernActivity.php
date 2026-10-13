<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConcernActivity extends Model
{
    public const CREATED = 'created';

    public const ASSIGNED = 'assigned';

    public const UNASSIGNED = 'unassigned';

    public const DETAILS_UPDATED = 'details_updated';

    public const PRIORITY_CHANGED = 'priority_changed';

    public const CATEGORY_CHANGED = 'category_changed';

    public const DUE_DATE_CHANGED = 'due_date_changed';

    public const DELETED = 'deleted';

    public const UPDATED_AT = null;

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'properties' => 'array',
        ];
    }

    public function concern(): BelongsTo
    {
        return $this->belongsTo(Concern::class)->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(Concern $concern, ?User $actor, string $type, array $properties = []): self
    {
        $activity = new self;
        $activity->forceFill([
            'organization_id' => $concern->organization_id,
            'concern_id' => $concern->id,
            'user_id' => $actor?->id,
            'type' => $type,
            'properties' => $properties ?: null,
        ])->save();

        return $activity;
    }
}
