<?php

namespace App\Services;

use App\Enums\ConcernStatus;
use App\Models\Concern;
use App\Models\ConcernStatusHistory;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConcernWorkflow
{
    public const REQUIRES_NOTE = 'note';

    public const REQUIRES_RESOLUTION = 'resolution';

    private const NOTE_MIN = 5;

    private const RESOLUTION_MIN = 10;

    private const TEAM_TRANSITIONS = [
        'open' => ['under_review', 'in_progress', 'closed'],
        'under_review' => ['in_progress', 'waiting_for_customer', 'closed'],
        'in_progress' => ['resolved', 'waiting_for_customer'],
        'waiting_for_customer' => ['in_progress', 'closed'],
        'resolved' => ['closed', 'in_progress'],
        'closed' => [],
    ];

    private const ADMIN_TRANSITIONS = [
        'closed' => ['in_progress'],
    ];

    private const CREATOR_TRANSITIONS = [
        'resolved' => ['closed'],
    ];

    /** @return list<array{status: ConcernStatus, requires: ?string}> */
    public function transitionsFor(Concern $concern, User $user, Membership $membership): array
    {
        if ($membership->organization_id !== $concern->organization_id || $membership->user_id !== $user->id) {
            return [];
        }

        $from = $concern->status->value;
        $targets = [];

        if ($membership->isAdmin()) {
            $targets = [...self::TEAM_TRANSITIONS[$from], ...(self::ADMIN_TRANSITIONS[$from] ?? [])];
        } elseif ($membership->isStaff()) {
            // Staff work concerns that are theirs or not yet owned by anyone.
            if ($concern->assigned_to === null || $concern->assigned_to === $user->id) {
                $targets = self::TEAM_TRANSITIONS[$from];
            }
        } elseif ($concern->created_by === $user->id) {
            $targets = self::CREATOR_TRANSITIONS[$from] ?? [];
        }

        return array_map(fn (string $target) => [
            'status' => ConcernStatus::from($target),
            'requires' => $this->requirement($concern->status, ConcernStatus::from($target), $membership),
        ], $targets);
    }

    public function transition(Concern $concern, User $actor, Membership $membership, ConcernStatus $to, ?string $note = null): Concern
    {
        $note = $note !== null ? trim($note) : null;
        $note = $note === '' ? null : $note;

        return DB::transaction(function () use ($concern, $actor, $membership, $to, $note) {
            // Re-read under lock so concurrent updates validate against the real current status.
            $concern = Concern::whereKey($concern->id)->lockForUpdate()->firstOrFail();

            $allowed = collect($this->transitionsFor($concern, $actor, $membership))
                ->firstWhere('status', $to);

            if (! $allowed) {
                throw ValidationException::withMessages([
                    'status' => sprintf(
                        'A concern that is %s cannot be moved to %s.',
                        strtolower($concern->status->label()),
                        strtolower($to->label()),
                    ),
                ]);
            }

            $this->validateNote($allowed['requires'], $to, $note);

            return $this->apply($concern, $actor, $to, $note);
        });
    }

    public function customerResponded(Concern $concern, User $customer): Concern
    {
        return DB::transaction(function () use ($concern, $customer) {
            $concern = Concern::whereKey($concern->id)->lockForUpdate()->firstOrFail();

            if ($concern->status !== ConcernStatus::WaitingForCustomer) {
                return $concern;
            }

            return $this->apply($concern, $customer, ConcernStatus::InProgress, 'Customer responded with the requested information.');
        });
    }

    public function recordInitialStatus(Concern $concern, User $actor): void
    {
        $this->writeHistory($concern, $actor, null, $concern->status, 'Concern submitted.');
    }

    private function apply(Concern $concern, User $actor, ConcernStatus $to, ?string $note): Concern
    {
        $from = $concern->status;

        $attributes = ['status' => $to];

        if ($to === ConcernStatus::Resolved) {
            $attributes['resolution_note'] = $note;
            $attributes['resolved_at'] = now();
        } elseif ($to === ConcernStatus::Closed) {
            $attributes['closed_at'] = now();
        } elseif (! $from->isActive()) {
            // Reopened: the earlier resolution stays in the history, not on the concern.
            $attributes['resolution_note'] = null;
            $attributes['resolved_at'] = null;
            $attributes['closed_at'] = null;
        }

        $concern->forceFill($attributes)->save();

        $this->writeHistory($concern, $actor, $from, $to, $note);

        return $concern;
    }

    private function requirement(ConcernStatus $from, ConcernStatus $to, Membership $membership): ?string
    {
        if ($to === ConcernStatus::Resolved) {
            return self::REQUIRES_RESOLUTION;
        }

        // Asking the customer for information needs the actual question.
        if ($to === ConcernStatus::WaitingForCustomer) {
            return self::REQUIRES_NOTE;
        }

        // Closing without a resolution, or reopening, must be explained.
        if ($to === ConcernStatus::Closed && $from !== ConcernStatus::Resolved) {
            return self::REQUIRES_NOTE;
        }

        if (! $from->isActive() && $to->isActive()) {
            return self::REQUIRES_NOTE;
        }

        return null;
    }

    private function validateNote(?string $requirement, ConcernStatus $to, ?string $note): void
    {
        $length = mb_strlen((string) $note);

        if ($requirement === self::REQUIRES_RESOLUTION && $length < self::RESOLUTION_MIN) {
            throw ValidationException::withMessages([
                'note' => sprintf('Describe how the concern was resolved (at least %d characters).', self::RESOLUTION_MIN),
            ]);
        }

        if ($requirement === self::REQUIRES_NOTE && $length < self::NOTE_MIN) {
            throw ValidationException::withMessages([
                'note' => $to === ConcernStatus::WaitingForCustomer
                    ? 'Tell the customer what information you need.'
                    : 'Add a short note explaining this change.',
            ]);
        }
    }

    private function writeHistory(Concern $concern, User $actor, ?ConcernStatus $from, ConcernStatus $to, ?string $note): void
    {
        (new ConcernStatusHistory)->forceFill([
            'concern_id' => $concern->id,
            'changed_by' => $actor->id,
            'old_status' => $from,
            'new_status' => $to,
            'note' => $note,
        ])->save();
    }
}
