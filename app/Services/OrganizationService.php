<?php

namespace App\Services;

use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Models\Category;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrganizationService
{
    public function create(User $owner, string $name, ?string $description = null): Organization
    {
        return DB::transaction(function () use ($owner, $name, $description) {
            $organization = new Organization(['name' => $name, 'description' => $description]);
            $organization->forceFill([
                'slug' => Organization::uniqueSlug($name),
                'status' => 'active',
                'join_code' => Organization::newJoinCode(),
            ])->save();

            $this->addMember($organization, $owner, MemberRole::Admin);

            foreach (config('resolvedesk.starter_categories') as $category) {
                $organization->categories()->save(new Category(['name' => $category]));
            }

            $owner->forceFill(['current_organization_id' => $organization->id])->save();

            return $organization;
        });
    }

    public function addMember(Organization $organization, User $user, MemberRole $role): Membership
    {
        $membership = new Membership;
        $membership->forceFill([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => MembershipStatus::Active,
        ])->save();

        return $membership;
    }

    public function findByJoinCode(?string $code): ?Organization
    {
        $code = Str::upper(trim((string) $code));

        if ($code === '') {
            return null;
        }

        return Organization::where('join_code', $code)->where('status', 'active')->first();
    }

    public function joinAsCustomer(User $user, string $code): Membership
    {
        $organization = $this->findByJoinCode($code)
            ?? throw ValidationException::withMessages(['code' => 'This workspace code is not recognised.']);

        $existing = Membership::where('organization_id', $organization->id)->where('user_id', $user->id)->first();

        if ($existing) {
            if ($existing->status !== MembershipStatus::Active) {
                throw ValidationException::withMessages(['code' => 'Your access to this workspace has been suspended.']);
            }

            $membership = $existing;
        } else {
            $membership = $this->addMember($organization, $user, MemberRole::Customer);
        }

        $user->forceFill(['current_organization_id' => $organization->id])->save();

        return $membership;
    }
}
