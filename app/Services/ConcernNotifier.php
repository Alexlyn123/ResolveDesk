<?php

namespace App\Services;

use App\Enums\CommentVisibility;
use App\Enums\ConcernStatus;
use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Models\Concern;
use App\Models\Membership;
use App\Models\User;
use App\Notifications\ConcernNotification;
use Illuminate\Support\Facades\Notification;

class ConcernNotifier
{
    public function submitted(Concern $concern, User $actor, Membership $membership): void
    {
        if (! $membership->isCustomer()) {
            return;
        }

        $admins = User::whereIn('id', Membership::where('organization_id', $concern->organization_id)
            ->where('role', MemberRole::Admin)
            ->where('status', MembershipStatus::Active)
            ->select('user_id'))->get();

        $this->send($admins, $actor, $concern, 'submitted', "{$actor->name} submitted a new concern.");
    }

    public function assigned(Concern $concern, User $actor, User $assignee): void
    {
        $this->send([$assignee], $actor, $concern, 'assigned', "{$actor->name} assigned this concern to you.");
    }

    public function statusChanged(Concern $concern, User $actor, ConcernStatus $from): void
    {
        if ($concern->status === $from) {
            return;
        }

        $label = strtolower($concern->status->label());
        $message = match ($concern->status) {
            ConcernStatus::WaitingForCustomer => 'More information is needed to continue with your concern.',
            ConcernStatus::Resolved => 'Your concern has been resolved.',
            default => "Status changed to {$label}.",
        };

        $recipients = collect([$concern->creator]);

        if ($actor->id === $concern->created_by && $concern->assignee) {
            $recipients = collect([$concern->assignee]);
            $message = "{$actor->name} moved this concern to {$label}.";
        }

        $this->send($recipients, $actor, $concern, 'status_changed', $message);
    }

    public function commented(Concern $concern, User $actor, Membership $membership, CommentVisibility $visibility): void
    {
        if ($membership->isCustomer()) {
            $this->send([$concern->assignee], $actor, $concern, 'customer_replied', "{$actor->name} replied.");

            return;
        }

        if ($visibility === CommentVisibility::Internal) {
            // Private notes only ever notify the team member who owns the concern.
            $this->send([$concern->assignee], $actor, $concern, 'internal_note', "{$actor->name} added an internal note.");

            return;
        }

        $this->send([$concern->creator, $concern->assignee], $actor, $concern, 'commented', "{$actor->name} posted an update.");
    }

    /** @param  iterable<User|null>  $recipients */
    private function send(iterable $recipients, User $actor, Concern $concern, string $kind, string $message): void
    {
        $recipients = collect($recipients)
            ->filter()
            ->reject(fn (User $user) => $user->id === $actor->id)
            ->unique('id');

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new ConcernNotification($concern, $kind, $message));
        }
    }
}
