<?php

namespace App\Http\Resources;

use App\Models\Concern;
use App\Models\User;
use App\Services\ConcernWorkflow;
use App\Support\OrganizationContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin Concern */
class ConcernResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $membership = app(OrganizationContext::class)->membershipFor($user, $this->organization_id);
        $isTeam = (bool) $membership?->isTeam();

        // The detail endpoint loads the history; list endpoints do not.
        $detailed = $this->resource->relationLoaded('statusHistories');

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'excerpt' => Str::limit(Str::squish($this->description), 160),
            'description' => $this->when($detailed, $this->description),
            'priority' => $this->priority->value,
            'status' => $this->status->value,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            // Email addresses are only shared with the team and with the person themselves.
            'creator' => $this->whenLoaded('creator', fn () => self::person(
                $this->creator,
                withEmail: $isTeam || $this->created_by === $user->id,
            )),
            'assignee' => $this->whenLoaded('assignee', fn () => self::person($this->assignee, withEmail: $isTeam)),
            'due_at' => $this->due_at?->toIso8601String(),
            // The calendar day, free of time-zone arithmetic, for display and date inputs.
            'due_on' => $this->due_at?->toDateString(),
            'is_overdue' => $this->isOverdue(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'resolution_note' => $this->when($detailed, $this->resolution_note),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),

            'permissions' => [
                'update' => $user->can('update', $this->resource),
                'delete' => $user->can('delete', $this->resource),
                'assign' => $user->can('assign', $this->resource),
                'change_status' => $user->can('changeStatus', $this->resource),
                'comment' => $user->can('comment', $this->resource),
                'comment_internally' => $user->can('commentInternally', $this->resource),
            ],

            'transitions' => $this->when($detailed && $membership, fn () => array_map(
                fn (array $transition) => [
                    'status' => $transition['status']->value,
                    'label' => $transition['status']->label(),
                    'requires' => $transition['requires'],
                ],
                app(ConcernWorkflow::class)->transitionsFor($this->resource, $user, $membership),
            )),

            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            'status_history' => StatusHistoryResource::collection($this->whenLoaded('statusHistories')),
            'activities' => ActivityResource::collection($this->whenLoaded('activities')),
        ];
    }

    public static function person(?User $user, bool $withEmail = false): ?array
    {
        if (! $user) {
            return null;
        }

        return array_filter([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $withEmail ? $user->email : null,
        ], fn ($value) => $value !== null);
    }
}
