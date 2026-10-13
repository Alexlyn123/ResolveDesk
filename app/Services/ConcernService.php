<?php

namespace App\Services;

use App\Enums\CommentVisibility;
use App\Enums\ConcernPriority;
use App\Enums\ConcernStatus;
use App\Models\Concern;
use App\Models\ConcernActivity;
use App\Models\ConcernComment;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ConcernService
{
    public function __construct(
        private TicketReferenceGenerator $references,
        private ConcernWorkflow $workflow,
        private ConcernNotifier $notifier,
    ) {}

    /** @param  array{title: string, description: string, category_id: int, priority?: string, due_at?: ?string}  $data  validated input */
    public function create(User $actor, Membership $membership, array $data): Concern
    {
        $concern = DB::transaction(function () use ($actor, $membership, $data) {
            $concern = new Concern([
                'title' => $data['title'],
                'description' => $data['description'],
                'category_id' => $data['category_id'],
                'priority' => $data['priority'] ?? ConcernPriority::Medium->value,
                'due_at' => $this->endOfDueDay($data['due_at'] ?? null),
            ]);

            // Identity and scope come from the session, never from the payload.
            $concern->forceFill([
                'reference' => $this->references->next(),
                'organization_id' => $membership->organization_id,
                'created_by' => $actor->id,
                'status' => ConcernStatus::Open,
            ])->save();

            $this->workflow->recordInitialStatus($concern, $actor);
            ConcernActivity::record($concern, $actor, ConcernActivity::CREATED);

            return $concern;
        });

        $this->notifier->submitted($concern, $actor, $membership);

        return $concern;
    }

    public function update(Concern $concern, User $actor, array $data): Concern
    {
        if (array_key_exists('due_at', $data)) {
            $data['due_at'] = $this->endOfDueDay($data['due_at']);
        }

        return DB::transaction(function () use ($concern, $actor, $data) {
            $concern->fill($data);

            if (! $concern->isDirty()) {
                return $concern;
            }

            $original = $concern->getOriginal();
            $dirty = array_keys($concern->getDirty());
            $concern->save();

            if (array_intersect($dirty, ['title', 'description'])) {
                ConcernActivity::record($concern, $actor, ConcernActivity::DETAILS_UPDATED, [
                    'fields' => array_values(array_intersect($dirty, ['title', 'description'])),
                ]);
            }

            if (in_array('priority', $dirty, true)) {
                ConcernActivity::record($concern, $actor, ConcernActivity::PRIORITY_CHANGED, [
                    'from' => $original['priority']->value,
                    'to' => $concern->priority->value,
                ]);
            }

            if (in_array('category_id', $dirty, true)) {
                ConcernActivity::record($concern, $actor, ConcernActivity::CATEGORY_CHANGED, [
                    'from' => $concern->category()->getRelated()->newQuery()->whereKey($original['category_id'])->value('name'),
                    'to' => $concern->category()->value('name'),
                ]);
            }

            if (in_array('due_at', $dirty, true)) {
                ConcernActivity::record($concern, $actor, ConcernActivity::DUE_DATE_CHANGED, [
                    'from' => $original['due_at']?->toDateString(),
                    'to' => $concern->due_at?->toDateString(),
                ]);
            }

            return $concern;
        });
    }

    public function assign(Concern $concern, User $actor, ?User $assignee): Concern
    {
        if ($concern->assigned_to === $assignee?->id) {
            return $concern;
        }

        DB::transaction(function () use ($concern, $actor, $assignee) {
            $previous = $concern->assignee?->name;

            $concern->forceFill(['assigned_to' => $assignee?->id])->save();
            $concern->setRelation('assignee', $assignee);

            ConcernActivity::record(
                $concern,
                $actor,
                $assignee ? ConcernActivity::ASSIGNED : ConcernActivity::UNASSIGNED,
                array_filter(['from' => $previous, 'to' => $assignee?->name]),
            );
        });

        if ($assignee) {
            $this->notifier->assigned($concern, $actor, $assignee);
        }

        return $concern;
    }

    public function changeStatus(Concern $concern, User $actor, Membership $membership, ConcernStatus $to, ?string $note): Concern
    {
        $from = $concern->status;
        $concern = $this->workflow->transition($concern, $actor, $membership, $to, $note);

        $this->notifier->statusChanged($concern, $actor, $from);

        return $concern;
    }

    public function addComment(Concern $concern, User $actor, Membership $membership, string $body, CommentVisibility $visibility): ConcernComment
    {
        // Customers cannot write private notes, whatever the request says.
        if ($membership->isCustomer()) {
            $visibility = CommentVisibility::Public;
        }

        $comment = DB::transaction(function () use ($concern, $actor, $membership, $body, $visibility) {
            $comment = new ConcernComment(['body' => $body]);
            $comment->forceFill([
                'concern_id' => $concern->id,
                'user_id' => $actor->id,
                'visibility' => $visibility,
            ])->save();

            if ($membership->isCustomer()) {
                $this->workflow->customerResponded($concern, $actor);
            }

            $concern->touch();

            return $comment;
        });

        $this->notifier->commented($concern->refresh(), $actor, $membership, $visibility);

        return $comment->setRelation('user', $actor);
    }

    private function endOfDueDay(mixed $date): ?Carbon
    {
        return $date ? Carbon::parse($date)->endOfDay() : null;
    }

    public function delete(Concern $concern, User $actor): void
    {
        DB::transaction(function () use ($concern, $actor) {
            ConcernActivity::record($concern, $actor, ConcernActivity::DELETED, [
                'status' => $concern->status->value,
            ]);

            $concern->delete();
        });
    }
}
