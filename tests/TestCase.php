<?php

namespace Tests;

use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Models\Category;
use App\Models\Concern;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function member(Organization $organization, MemberRole $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes + ['current_organization_id' => $organization->id]);

        Membership::factory()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => MembershipStatus::Active,
        ]);

        return $user;
    }

    protected function customer(Organization $organization): User
    {
        return $this->member($organization, MemberRole::Customer);
    }

    protected function staff(Organization $organization): User
    {
        return $this->member($organization, MemberRole::Staff);
    }

    protected function admin(Organization $organization): User
    {
        return $this->member($organization, MemberRole::Admin);
    }

    protected function category(Organization $organization, array $attributes = []): Category
    {
        return Category::factory()->create($attributes + ['organization_id' => $organization->id]);
    }

    protected function concern(Organization $organization, User $creator, array $attributes = []): Concern
    {
        return Concern::factory()->create($attributes + [
            'organization_id' => $organization->id,
            'created_by' => $creator->id,
            'category_id' => $this->category($organization)->id,
        ]);
    }

    protected function fromSpa(): static
    {
        return $this->withHeaders(['Origin' => 'http://localhost', 'Accept' => 'application/json']);
    }
}
