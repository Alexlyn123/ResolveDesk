<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;
use App\Support\OrganizationContext;
use Illuminate\Auth\Access\Response;

class OrganizationPolicy
{
    public function __construct(private OrganizationContext $context) {}

    public function view(User $user, Organization $organization): Response
    {
        return $this->context->membershipFor($user, $organization->id)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function update(User $user, Organization $organization): Response
    {
        $membership = $this->context->membershipFor($user, $organization->id);

        if (! $membership) {
            return Response::denyAsNotFound();
        }

        return $membership->isAdmin()
            ? Response::allow()
            : Response::deny('Only organization administrators can change workspace settings.');
    }
}
