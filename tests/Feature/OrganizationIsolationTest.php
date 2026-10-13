<?php

namespace Tests\Feature;

use App\Enums\ConcernStatus;
use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Models\Concern;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Organization $ours;

    private Organization $theirs;

    private Concern $theirConcern;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ours = Organization::factory()->create();
        $this->theirs = Organization::factory()->create();
        $this->theirConcern = $this->concern($this->theirs, $this->customer($this->theirs), [
            'title' => 'Confidential matter of the other organization',
        ]);
    }

    public function test_changing_the_id_does_not_expose_another_customers_concern(): void
    {
        $alice = $this->customer($this->ours);
        $bob = $this->customer($this->ours);

        $mine = $this->concern($this->ours, $alice, ['title' => 'Alice private concern']);
        $bobs = $this->concern($this->ours, $bob, ['title' => 'Bob private concern']);

        $this->actingAs($alice)->getJson("/api/concerns/{$mine->id}")->assertOk();

        // Same workspace, someone else's record: every verb is refused.
        $this->actingAs($alice)->getJson("/api/concerns/{$bobs->id}")->assertForbidden()->assertDontSee('Bob private concern');
        $this->actingAs($alice)->getJson("/api/concerns/{$bobs->id}/comments")->assertForbidden();
        $this->actingAs($alice)->patchJson("/api/concerns/{$bobs->id}", ['title' => 'Taken over by Alice'])->assertForbidden();
        $this->actingAs($alice)->deleteJson("/api/concerns/{$bobs->id}")->assertForbidden();
        $this->actingAs($alice)->postJson("/api/concerns/{$bobs->id}/comments", ['body' => 'Hello there'])->assertForbidden();
        $this->actingAs($alice)->postJson("/api/concerns/{$bobs->id}/status", ['status' => 'closed'])->assertForbidden();
        $this->actingAs($alice)->postJson("/api/concerns/{$bobs->id}/assign", ['assigned_to' => $alice->id])->assertForbidden();

        $bobs->refresh();
        $this->assertSame('Bob private concern', $bobs->title);
        $this->assertSame(ConcernStatus::Open, $bobs->status);
        $this->assertNull($bobs->deleted_at);
    }

    public function test_a_customers_list_and_search_only_contain_their_own_concerns(): void
    {
        $alice = $this->customer($this->ours);
        $bob = $this->customer($this->ours);

        $mine = $this->concern($this->ours, $alice, ['title' => 'Shared keyword alpha']);
        $this->concern($this->ours, $bob, ['title' => 'Shared keyword beta']);

        $this->actingAs($alice)->getJson('/api/concerns')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mine->id);

        $this->actingAs($alice)->getJson('/api/concerns?search=keyword')->assertJsonCount(1, 'data');

        // The assignee filter is ignored for customers rather than widening their view.
        $this->actingAs($alice)->getJson('/api/concerns?assignee=unassigned')->assertJsonCount(1, 'data');
    }

    public function test_members_cannot_read_another_organizations_concerns(): void
    {
        foreach ([$this->customer($this->ours), $this->staff($this->ours), $this->admin($this->ours)] as $user) {
            $this->actingAs($user)->getJson("/api/concerns/{$this->theirConcern->id}")
                ->assertNotFound()
                ->assertDontSee('Confidential matter');

            $this->actingAs($user)->getJson("/api/concerns/{$this->theirConcern->id}/comments")->assertNotFound();

            $this->actingAs($user)->getJson('/api/concerns')->assertOk()->assertJsonCount(0, 'data');
            $this->actingAs($user)->getJson('/api/concerns?search=Confidential')->assertJsonCount(0, 'data');
            $this->actingAs($user)->getJson('/api/concerns?search='.$this->theirConcern->reference)->assertJsonCount(0, 'data');
        }
    }

    public function test_staff_and_admins_cannot_modify_another_organizations_concerns(): void
    {
        $admin = $this->admin($this->ours);
        $staff = $this->staff($this->ours);
        $id = $this->theirConcern->id;

        foreach ([$admin, $staff] as $user) {
            $this->actingAs($user)->patchJson("/api/concerns/{$id}", ['priority' => 'urgent'])->assertNotFound();
            $this->actingAs($user)->deleteJson("/api/concerns/{$id}")->assertNotFound();
            $this->actingAs($user)->postJson("/api/concerns/{$id}/assign", ['assigned_to' => $user->id])->assertNotFound();
            $this->actingAs($user)->postJson("/api/concerns/{$id}/status", ['status' => 'under_review'])->assertNotFound();
            $this->actingAs($user)->postJson("/api/concerns/{$id}/comments", ['body' => 'We can see you.'])->assertNotFound();
        }

        $this->theirConcern->refresh();
        $this->assertSame(ConcernStatus::Open, $this->theirConcern->status);
        $this->assertNull($this->theirConcern->assigned_to);
        $this->assertNull($this->theirConcern->deleted_at);
        $this->assertDatabaseCount('concern_comments', 0);
    }

    public function test_a_concern_cannot_be_filed_under_another_organization(): void
    {
        $customer = $this->customer($this->ours);
        $foreignCategory = $this->category($this->theirs);

        // Supplying organization_id is ignored; supplying their category is rejected.
        $this->actingAs($customer)->postJson('/api/concerns', [
            'title' => 'Crossing workspaces',
            'description' => 'This should not be accepted anywhere.',
            'category_id' => $foreignCategory->id,
            'organization_id' => $this->theirs->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('category_id');

        $this->assertSame(1, Concern::where('organization_id', $this->theirs->id)->count());
    }

    public function test_other_organizations_categories_members_and_settings_are_unreachable(): void
    {
        $admin = $this->admin($this->ours);
        $theirCategory = $this->category($this->theirs, ['name' => 'Their category']);
        $theirMember = Membership::where('organization_id', $this->theirs->id)->firstOrFail();

        $this->actingAs($admin)->getJson('/api/categories')->assertOk()->assertDontSee('Their category');
        $this->actingAs($admin)->getJson("/api/categories/{$theirCategory->id}")->assertNotFound();
        $this->actingAs($admin)->patchJson("/api/categories/{$theirCategory->id}", ['name' => 'Renamed'])->assertNotFound();
        $this->actingAs($admin)->deleteJson("/api/categories/{$theirCategory->id}")->assertNotFound();

        $this->actingAs($admin)->patchJson("/api/members/{$theirMember->id}", ['role' => 'admin'])->assertNotFound();
        $this->actingAs($admin)->deleteJson("/api/members/{$theirMember->id}")->assertNotFound();
        $this->actingAs($admin)->getJson('/api/members')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($admin)->getJson("/api/organizations/{$this->theirs->id}")->assertNotFound();
        $this->actingAs($admin)->patchJson("/api/organizations/{$this->theirs->id}", ['name' => 'Hijacked'])->assertNotFound();
        $this->actingAs($admin)->postJson("/api/organizations/{$this->theirs->id}/join-code")->assertNotFound();
        $this->actingAs($admin)->postJson("/api/organizations/{$this->theirs->id}/switch")->assertNotFound();

        $this->assertSame('Their category', $theirCategory->fresh()->name);
        $this->assertSame(MemberRole::Customer, $theirMember->fresh()->role);
        $this->assertNotSame('Hijacked', $this->theirs->fresh()->name);
        $this->assertSame($this->ours->id, $admin->fresh()->current_organization_id);
    }

    public function test_dashboard_and_reports_only_count_the_current_organization(): void
    {
        $admin = $this->admin($this->ours);
        $this->concern($this->ours, $this->customer($this->ours));

        $this->actingAs($admin)->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.metrics.total', 1)
            ->assertDontSee('Confidential matter');

        $this->actingAs($admin)->getJson('/api/reports/summary')->assertOk()
            ->assertJsonPath('data.totals.active_now', 1)
            ->assertDontSee('Confidential matter');
    }

    public function test_a_suspended_member_loses_access(): void
    {
        $staff = $this->staff($this->ours);
        $this->actingAs($staff)->getJson('/api/concerns')->assertOk();

        Membership::where('user_id', $staff->id)->update(['status' => MembershipStatus::Suspended->value]);

        $this->actingAs($staff)->getJson('/api/concerns')->assertForbidden()->assertJsonPath('code', 'no_organization');
    }

    public function test_a_user_in_two_organizations_only_sees_the_active_one(): void
    {
        $user = $this->staff($this->ours);
        Membership::factory()->create(['organization_id' => $this->theirs->id, 'user_id' => $user->id, 'role' => MemberRole::Customer]);

        $ourConcern = $this->concern($this->ours, $this->customer($this->ours));

        // Active workspace: ours (as staff). Their concern is invisible even though the user is a member there.
        $this->actingAs($user)->getJson('/api/concerns')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ourConcern->id);
        $this->actingAs($user)->getJson("/api/concerns/{$this->theirConcern->id}")->assertNotFound();

        // After switching, the role is the one held there: a customer who sees only their own concerns.
        $this->actingAs($user)->postJson("/api/organizations/{$this->theirs->id}/switch")
            ->assertOk()->assertJsonPath('data.current.role', 'customer');

        $this->actingAs($user->fresh())->getJson('/api/concerns')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($user->fresh())->getJson("/api/concerns/{$this->theirConcern->id}")->assertForbidden();
        $this->actingAs($user->fresh())->getJson("/api/concerns/{$ourConcern->id}")->assertNotFound();
    }

    public function test_joining_with_a_code_never_grants_more_than_the_customer_role(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/organizations/join', ['code' => 'WRONG-CODE'])
            ->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->actingAs($user)->postJson('/api/organizations/join', ['code' => $this->theirs->join_code, 'role' => 'admin'])
            ->assertOk()->assertJsonPath('data.current.role', 'customer');

        $this->assertSame(
            MemberRole::Customer,
            Membership::where('user_id', $user->id)->where('organization_id', $this->theirs->id)->firstOrFail()->role,
        );
    }
}
