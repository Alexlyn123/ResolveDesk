<?php

namespace App\Policies;

use App\Enums\ConcernStatus;
use App\Models\Concern;
use App\Models\Membership;
use App\Models\User;
use App\Services\ConcernWorkflow;
use App\Support\OrganizationContext;
use Illuminate\Auth\Access\Response;

class ConcernPolicy
{
    public function __construct(
        private OrganizationContext $context,
        private ConcernWorkflow $workflow,
    ) {}

    public function viewAny(User $user): bool
    {
        return true; // The query itself is scoped by Concern::visibleTo().
    }

    public function view(User $user, Concern $concern): Response
    {
        $membership = $this->membership($user, $concern);

        // A concern in another workspace does not exist as far as this user is concerned.
        if (! $membership) {
            return Response::denyAsNotFound();
        }

        if ($membership->isTeam() || $concern->created_by === $user->id) {
            return Response::allow();
        }

        return Response::deny('You do not have access to this concern.');
    }

    public function create(User $user): bool
    {
        return true; // Any active member; membership is enforced by middleware.
    }

    public function update(User $user, Concern $concern): Response
    {
        if (($view = $this->view($user, $concern))->denied()) {
            return $view;
        }

        $membership = $this->membership($user, $concern);

        if ($concern->status === ConcernStatus::Closed) {
            return Response::deny('Closed concerns can no longer be edited.');
        }

        if ($membership->isAdmin()) {
            return Response::allow();
        }

        if ($membership->isStaff()) {
            return $this->ownedOrUnassigned($user, $concern)
                ? Response::allow()
                : Response::deny('This concern is assigned to another team member.');
        }

        return $concern->status === ConcernStatus::Open
            ? Response::allow()
            : Response::deny('This concern is already being handled and can no longer be edited.');
    }

    public function delete(User $user, Concern $concern): Response
    {
        if (($view = $this->view($user, $concern))->denied()) {
            return $view;
        }

        $membership = $this->membership($user, $concern);

        if ($membership->isAdmin()) {
            return Response::allow();
        }

        if ($membership->isStaff()) {
            return Response::deny('Staff close or resolve concerns instead of deleting them.');
        }

        return $concern->status === ConcernStatus::Open && $concern->assigned_to === null
            ? Response::allow()
            : Response::deny('This concern is already being handled and can no longer be withdrawn.');
    }

    public function assign(User $user, Concern $concern): Response
    {
        if (($view = $this->view($user, $concern))->denied()) {
            return $view;
        }

        if (! $this->membership($user, $concern)->isTeam()) {
            return Response::deny('Only staff can assign concerns.');
        }

        return $concern->status === ConcernStatus::Closed
            ? Response::deny('Closed concerns cannot be reassigned.')
            : Response::allow();
    }

    public function changeStatus(User $user, Concern $concern): Response
    {
        if (($view = $this->view($user, $concern))->denied()) {
            return $view;
        }

        return $this->workflow->transitionsFor($concern, $user, $this->membership($user, $concern)) !== []
            ? Response::allow()
            : Response::deny('You cannot change the status of this concern.');
    }

    public function comment(User $user, Concern $concern): Response
    {
        if (($view = $this->view($user, $concern))->denied()) {
            return $view;
        }

        return $concern->status === ConcernStatus::Closed
            ? Response::deny('This concern is closed.')
            : Response::allow();
    }

    public function commentInternally(User $user, Concern $concern): bool
    {
        return $this->comment($user, $concern)->allowed()
            && $this->membership($user, $concern)->isTeam();
    }

    public function viewInternal(User $user, Concern $concern): bool
    {
        return (bool) $this->membership($user, $concern)?->isTeam();
    }

    private function membership(User $user, Concern $concern): ?Membership
    {
        return $this->context->membershipFor($user, $concern->organization_id);
    }

    private function ownedOrUnassigned(User $user, Concern $concern): bool
    {
        return $concern->assigned_to === null || $concern->assigned_to === $user->id;
    }
}
