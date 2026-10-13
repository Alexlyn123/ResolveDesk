<?php

namespace App\Policies;

use App\Models\Membership;
use App\Models\User;
use App\Support\OrganizationContext;
use Illuminate\Auth\Access\Response;

class MembershipPolicy
{
    public function __construct(private OrganizationContext $context) {}

    public function viewAny(User $user): bool
    {
        return $this->context->membership()->isAdmin();
    }

    public function viewAssignable(User $user): bool
    {
        return $this->context->membership()->isTeam();
    }

    public function create(User $user): bool
    {
        return $this->context->membership()->isAdmin();
    }

    public function update(User $user, Membership $membership): Response
    {
        $own = $this->context->membershipFor($user, $membership->organization_id);

        if (! $own) {
            return Response::denyAsNotFound();
        }

        if (! $own->isAdmin()) {
            return Response::deny('Only organization administrators can manage the team.');
        }

        // Keeps at least one administrator in every workspace.
        return $membership->user_id === $user->id
            ? Response::deny('You cannot change your own role or access. Ask another administrator.')
            : Response::allow();
    }

    public function delete(User $user, Membership $membership): Response
    {
        return $this->update($user, $membership);
    }
}
