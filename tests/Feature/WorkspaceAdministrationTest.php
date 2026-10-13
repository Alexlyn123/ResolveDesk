<?php

namespace Tests\Feature;

use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkspaceAdministrationTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create();
        $this->admin = $this->admin($this->organization);
    }

    public function test_creating_a_workspace_makes_its_creator_the_administrator(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/organizations', ['name' => 'Harbor IT Services'])
            ->assertCreated()
            ->assertJsonPath('data.current.organization.name', 'Harbor IT Services')
            ->assertJsonPath('data.current.role', 'admin');

        $organization = Organization::where('name', 'Harbor IT Services')->firstOrFail();

        $this->assertSame('harbor-it-services', $organization->slug);
        $this->assertNotEmpty($organization->join_code);
        $this->assertGreaterThan(0, $organization->categories()->count());

        // Being an administrator there grants nothing in the existing workspace.
        $this->assertDatabaseMissing('organization_user', ['organization_id' => $this->organization->id, 'user_id' => $user->id]);
    }

    public function test_only_administrators_manage_categories(): void
    {
        $staff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);

        foreach ([$staff, $customer] as $user) {
            $this->actingAs($user)->postJson('/api/categories', ['name' => 'Sneaky'])->assertForbidden();
        }

        $id = $this->actingAs($this->admin)->postJson('/api/categories', ['name' => 'Plumbing', 'description' => 'Pipes and drains'])
            ->assertCreated()->json('data.id');

        $this->actingAs($this->admin)->postJson('/api/categories', ['name' => 'Plumbing'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($staff)->patchJson("/api/categories/{$id}", ['name' => 'Renamed'])->assertForbidden();
        $this->actingAs($this->admin)->patchJson("/api/categories/{$id}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);

        // Everyone can list; retired categories are hidden from non-administrators.
        $this->actingAs($customer)->getJson('/api/categories?include_inactive=1')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->admin)->getJson('/api/categories?include_inactive=1')->assertJsonCount(1, 'data');
    }

    public function test_the_same_category_name_may_exist_in_different_workspaces(): void
    {
        $this->category(Organization::factory()->create(), ['name' => 'Billing']);

        $this->actingAs($this->admin)->postJson('/api/categories', ['name' => 'Billing'])->assertCreated();
    }

    public function test_a_category_in_use_is_retired_rather_than_deleted(): void
    {
        $used = $this->category($this->organization);
        $unused = $this->category($this->organization);
        $this->concern($this->organization, $this->customer($this->organization), ['category_id' => $used->id]);

        $this->actingAs($this->admin)->deleteJson("/api/categories/{$used->id}")->assertConflict();
        $this->assertDatabaseHas('categories', ['id' => $used->id]);

        $this->actingAs($this->admin)->deleteJson("/api/categories/{$unused->id}")->assertNoContent();
        $this->assertDatabaseMissing('categories', ['id' => $unused->id]);
    }

    public function test_only_administrators_manage_members(): void
    {
        $staff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);
        $customerMembership = Membership::where('user_id', $customer->id)->firstOrFail();

        $this->actingAs($staff)->getJson('/api/members')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/members')->assertForbidden();
        $this->actingAs($staff)->patchJson("/api/members/{$customerMembership->id}", ['role' => 'staff'])->assertForbidden();

        // A customer cannot promote themselves.
        $this->actingAs($customer)->patchJson("/api/members/{$customerMembership->id}", ['role' => 'admin'])->assertForbidden();
        $this->assertSame(MemberRole::Customer, $customerMembership->fresh()->role);

        $this->actingAs($this->admin)->getJson('/api/members')->assertOk()->assertJsonCount(3, 'data');
        $this->actingAs($this->admin)->patchJson("/api/members/{$customerMembership->id}", ['role' => 'staff'])
            ->assertOk()->assertJsonPath('data.role', 'staff');
        $this->actingAs($this->admin)->patchJson("/api/members/{$customerMembership->id}", ['role' => 'owner'])
            ->assertUnprocessable();
    }

    public function test_an_administrator_cannot_change_their_own_access(): void
    {
        $own = Membership::where('user_id', $this->admin->id)->firstOrFail();

        $this->actingAs($this->admin)->patchJson("/api/members/{$own->id}", ['role' => 'customer'])->assertForbidden();
        $this->actingAs($this->admin)->deleteJson("/api/members/{$own->id}")->assertForbidden();

        $this->assertSame(MemberRole::Admin, $own->fresh()->role);
    }

    public function test_an_administrator_can_add_an_existing_account_to_the_team(): void
    {
        $account = User::factory()->create(['email' => 'newhire@example.com']);

        $this->actingAs($this->admin)->postJson('/api/members', ['email' => 'nobody@example.com', 'role' => 'staff'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->actingAs($this->admin)->postJson('/api/members', ['email' => 'newhire@example.com', 'role' => 'staff'])
            ->assertCreated()->assertJsonPath('data.role', 'staff');

        $this->actingAs($this->admin)->postJson('/api/members', ['email' => 'newhire@example.com', 'role' => 'admin'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('organization_user', [
            'organization_id' => $this->organization->id, 'user_id' => $account->id, 'role' => 'staff',
        ]);
    }

    public function test_suspending_a_staff_member_returns_their_active_concerns_to_the_queue(): void
    {
        $staff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);
        $active = $this->concern($this->organization, $customer, ['assigned_to' => $staff->id, 'status' => 'in_progress']);
        $finished = $this->concern($this->organization, $customer, ['assigned_to' => $staff->id, 'status' => 'closed', 'closed_at' => now()]);

        $membership = Membership::where('user_id', $staff->id)->firstOrFail();

        $this->actingAs($this->admin)->patchJson("/api/members/{$membership->id}", ['status' => 'suspended'])->assertOk();

        $this->assertSame(MembershipStatus::Suspended, $membership->fresh()->status);
        $this->assertNull($active->fresh()->assigned_to);
        $this->assertSame($staff->id, $finished->fresh()->assigned_to);
        $this->assertDatabaseHas('concern_activities', ['concern_id' => $active->id, 'type' => 'unassigned']);
    }

    public function test_only_administrators_change_workspace_settings_and_see_the_join_code(): void
    {
        $staff = $this->staff($this->organization);
        $id = $this->organization->id;

        $this->actingAs($staff)->getJson("/api/organizations/{$id}")->assertOk()->assertJsonMissingPath('data.join_code');
        $this->actingAs($staff)->patchJson("/api/organizations/{$id}", ['name' => 'Renamed by staff'])->assertForbidden();
        $this->actingAs($staff)->postJson("/api/organizations/{$id}/join-code")->assertForbidden();

        $this->actingAs($this->admin)->getJson("/api/organizations/{$id}")->assertOk()
            ->assertJsonPath('data.join_code', $this->organization->join_code);

        $this->actingAs($this->admin)->patchJson("/api/organizations/{$id}", ['name' => 'Northgate Living'])
            ->assertOk()->assertJsonPath('data.name', 'Northgate Living');

        $newCode = $this->actingAs($this->admin)->postJson("/api/organizations/{$id}/join-code")->assertOk()->json('data.join_code');
        $this->assertNotSame($this->organization->join_code, $newCode);
    }

    public function test_staff_can_list_assignable_people_but_customers_cannot(): void
    {
        $staff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);
        $this->staff(Organization::factory()->create());

        $this->actingAs($customer)->getJson('/api/members/assignable')->assertForbidden();

        $ids = $this->actingAs($staff)->getJson('/api/members/assignable')->assertOk()->json('data.*.id');
        $this->assertEqualsCanonicalizing([$this->admin->id, $staff->id], $ids);
    }
}
