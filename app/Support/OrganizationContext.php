<?php

namespace App\Support;

use App\Enums\MemberRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;

class OrganizationContext
{
    private ?Organization $organization = null;

    private ?Membership $membership = null;

    public function set(Organization $organization, Membership $membership): void
    {
        $this->organization = $organization;
        $this->membership = $membership;
    }

    public function clear(): void
    {
        $this->organization = null;
        $this->membership = null;
    }

    public function organization(): Organization
    {
        return $this->organization ?? abort(403, 'No workspace selected.');
    }

    public function membership(): Membership
    {
        return $this->membership ?? abort(403, 'No workspace selected.');
    }

    public function role(): MemberRole
    {
        return $this->membership()->role;
    }

    public function membershipFor(User $user, int $organizationId): ?Membership
    {
        if (! $this->membership
            || $this->membership->user_id !== $user->id
            || $this->membership->organization_id !== $organizationId) {
            return null;
        }

        return $this->membership;
    }
}
