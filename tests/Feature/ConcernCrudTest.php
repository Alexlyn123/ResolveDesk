<?php

namespace Tests\Feature;

use App\Enums\ConcernStatus;
use App\Models\Concern;
use App\Models\ConcernActivity;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConcernCrudTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create();
    }

    public function test_a_customer_can_submit_a_concern(): void
    {
        $customer = $this->customer($this->organization);
        $category = $this->category($this->organization);

        $response = $this->actingAs($customer)->postJson('/api/concerns', [
            'title' => 'Water leaking under the sink',
            'description' => 'There is a steady drip under the kitchen sink.',
            'category_id' => $category->id,
            'priority' => 'high',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.creator.id', $customer->id)
            ->assertJsonPath('data.assignee', null)
            ->assertJsonPath('data.status_history.0.old_status', null)
            ->assertJsonPath('data.status_history.0.new_status', 'open');

        $this->assertMatchesRegularExpression('/^RD-\d{4}-\d{6}$/', $response->json('data.reference'));

        $this->assertDatabaseHas('concerns', [
            'id' => $response->json('data.id'),
            'organization_id' => $this->organization->id,
            'created_by' => $customer->id,
            'status' => 'open',
        ]);
        $this->assertDatabaseHas('concern_status_histories', [
            'concern_id' => $response->json('data.id'),
            'old_status' => null,
            'new_status' => 'open',
            'changed_by' => $customer->id,
        ]);
    }

    public function test_ticket_references_are_unique_and_sequential(): void
    {
        $customer = $this->customer($this->organization);
        $category = $this->category($this->organization);

        $references = collect(range(1, 5))->map(fn () => $this->actingAs($customer)->postJson('/api/concerns', [
            'title' => 'A repeated concern',
            'description' => 'The same thing, submitted again.',
            'category_id' => $category->id,
        ])->assertCreated()->json('data.reference'));

        $year = now()->year;

        $this->assertSame(
            ["RD-{$year}-000001", "RD-{$year}-000002", "RD-{$year}-000003", "RD-{$year}-000004", "RD-{$year}-000005"],
            $references->all(),
        );
    }

    public function test_client_supplied_ownership_scope_and_state_are_ignored(): void
    {
        $customer = $this->customer($this->organization);
        $someoneElse = $this->customer($this->organization);
        $staff = $this->staff($this->organization);
        $otherOrganization = Organization::factory()->create();

        $response = $this->actingAs($customer)->postJson('/api/concerns', [
            'title' => 'Attempted spoofing',
            'description' => 'Trying to set fields I should not control.',
            'category_id' => $this->category($this->organization)->id,
            'created_by' => $someoneElse->id,
            'organization_id' => $otherOrganization->id,
            'assigned_to' => $staff->id,
            'status' => 'resolved',
            'reference' => 'RD-0000-000000',
            'resolved_at' => now()->toIso8601String(),
        ])->assertCreated();

        $concern = Concern::findOrFail($response->json('data.id'));

        $this->assertSame($customer->id, $concern->created_by);
        $this->assertSame($this->organization->id, $concern->organization_id);
        $this->assertNull($concern->assigned_to);
        $this->assertSame(ConcernStatus::Open, $concern->status);
        $this->assertNull($concern->resolved_at);
        $this->assertNotSame('RD-0000-000000', $concern->reference);
    }

    public function test_submission_is_validated(): void
    {
        $customer = $this->customer($this->organization);
        $foreignCategory = $this->category(Organization::factory()->create());
        $retiredCategory = $this->category($this->organization, ['is_active' => false]);

        $this->actingAs($customer)->postJson('/api/concerns', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'category_id']);

        $this->actingAs($customer)->postJson('/api/concerns', [
            'title' => str_repeat('a', 151),
            'description' => 'short',
            'category_id' => $foreignCategory->id,
            'priority' => 'catastrophic',
            'due_at' => now()->addDay()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['title', 'description', 'category_id', 'priority', 'due_at']);

        $this->actingAs($customer)->postJson('/api/concerns', [
            'title' => 'Valid title here',
            'description' => 'A perfectly valid description.',
            'category_id' => $retiredCategory->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('category_id');

        $this->assertDatabaseCount('concerns', 0);
    }

    public function test_listing_is_paginated_on_the_server(): void
    {
        $customer = $this->customer($this->organization);
        $category = $this->category($this->organization);

        Concern::factory()->count(23)->create([
            'organization_id' => $this->organization->id,
            'created_by' => $customer->id,
            'category_id' => $category->id,
        ]);

        $this->actingAs($this->staff($this->organization))->getJson('/api/concerns?per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 23)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.current_page', 1);

        $this->getJson('/api/concerns?per_page=10&page=3')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_listing_can_be_searched_filtered_and_sorted(): void
    {
        $staff = $this->staff($this->organization);
        $otherStaff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);
        $plumbing = $this->category($this->organization, ['name' => 'Plumbing']);

        $leak = $this->concern($this->organization, $customer, [
            'title' => 'Leaking pipe in basement', 'priority' => 'urgent', 'category_id' => $plumbing->id,
            'assigned_to' => $staff->id, 'status' => 'in_progress', 'due_at' => now()->subDay(),
            'created_at' => now()->subDays(10),
        ]);
        $noise = $this->concern($this->organization, $customer, [
            'title' => 'Noise at night', 'priority' => 'low', 'assigned_to' => $otherStaff->id,
            'created_at' => now()->subDays(2),
        ]);
        $billing = $this->concern($this->organization, $customer, [
            'title' => 'Billing question', 'priority' => 'medium', 'status' => 'resolved', 'resolved_at' => now(),
        ]);

        $ids = fn (string $query) => $this->actingAs($staff)->getJson("/api/concerns?{$query}")->assertOk()->json('data.*.id');

        $this->assertSame([$leak->id], $ids('search=leaking'));
        $this->assertSame([$noise->id], $ids('search='.$noise->reference));
        $this->assertSame([$billing->id], $ids('status=resolved'));
        $this->assertEqualsCanonicalizing([$leak->id, $noise->id], $ids('status=active'));
        $this->assertSame([$leak->id], $ids('category_id='.$plumbing->id));
        $this->assertSame([$noise->id], $ids('priority=low'));
        $this->assertSame([$leak->id], $ids('assignee=me'));
        $this->assertSame([$noise->id], $ids('assignee='.$otherStaff->id));
        $this->assertSame([$billing->id], $ids('assignee=unassigned'));
        $this->assertSame([$leak->id], $ids('overdue=1'));
        $this->assertSame([$leak->id], $ids('created_to='.now()->subDays(5)->toDateString()));
        $this->assertSame([$leak->id, $billing->id, $noise->id], $ids('sort=priority&direction=desc'));
        $this->assertSame([$leak->id, $noise->id, $billing->id], $ids('sort=created_at&direction=asc'));
        // A literal % must not act as a wildcard.
        $this->assertSame([], $ids('search=%25'));
    }

    public function test_sorting_and_filter_values_are_whitelisted(): void
    {
        $staff = $this->staff($this->organization);

        $this->actingAs($staff)->getJson('/api/concerns?sort=password')->assertUnprocessable()->assertJsonValidationErrors('sort');
        $this->actingAs($staff)->getJson('/api/concerns?sort='.urlencode('created_at;DROP TABLE users'))->assertUnprocessable();
        $this->actingAs($staff)->getJson('/api/concerns?direction=sideways')->assertUnprocessable();
        $this->actingAs($staff)->getJson('/api/concerns?status=bogus')->assertUnprocessable();
        $this->actingAs($staff)->getJson('/api/concerns?per_page=5000')->assertUnprocessable();
        $this->actingAs($staff)->getJson("/api/concerns?search=' OR 1=1 --")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_a_customer_can_view_and_edit_their_own_open_concern(): void
    {
        $customer = $this->customer($this->organization);
        $concern = $this->concern($this->organization, $customer);

        $this->actingAs($customer)->getJson("/api/concerns/{$concern->id}")
            ->assertOk()
            ->assertJsonPath('data.reference', $concern->reference)
            ->assertJsonPath('data.permissions.update', true)
            ->assertJsonPath('data.permissions.assign', false);

        $this->actingAs($customer)->patchJson("/api/concerns/{$concern->id}", [
            'title' => 'An updated, clearer title',
            'priority' => 'high',
        ])->assertOk()->assertJsonPath('data.title', 'An updated, clearer title');

        $this->assertDatabaseHas('concern_activities', ['concern_id' => $concern->id, 'type' => ConcernActivity::DETAILS_UPDATED]);
        $this->assertDatabaseHas('concern_activities', ['concern_id' => $concern->id, 'type' => ConcernActivity::PRIORITY_CHANGED]);
    }

    public function test_a_customer_cannot_edit_a_concern_once_it_is_being_handled(): void
    {
        $customer = $this->customer($this->organization);
        $concern = $this->concern($this->organization, $customer, ['status' => 'in_progress']);

        $this->actingAs($customer)->patchJson("/api/concerns/{$concern->id}", ['title' => 'Changing my mind'])
            ->assertForbidden();

        $this->assertSame($concern->title, $concern->fresh()->title);
    }

    public function test_a_customer_cannot_set_a_due_date_or_edit_through_update(): void
    {
        $customer = $this->customer($this->organization);
        $staff = $this->staff($this->organization);
        $concern = $this->concern($this->organization, $customer);

        $this->actingAs($customer)->patchJson("/api/concerns/{$concern->id}", ['due_at' => now()->addDay()->toDateString()])
            ->assertUnprocessable()->assertJsonValidationErrors('due_at');

        // Status and assignment are not editable fields at all; they are silently dropped.
        $this->actingAs($customer)->patchJson("/api/concerns/{$concern->id}", [
            'priority' => 'low', 'status' => 'closed', 'assigned_to' => $staff->id,
        ])->assertOk();

        $this->assertSame(ConcernStatus::Open, $concern->fresh()->status);
        $this->assertNull($concern->fresh()->assigned_to);
    }

    public function test_staff_can_set_priority_and_due_date_but_not_rewrite_the_customers_words(): void
    {
        $staff = $this->staff($this->organization);
        $concern = $this->concern($this->organization, $this->customer($this->organization));
        $due = now()->addDays(3)->toDateString();

        $this->actingAs($staff)->patchJson("/api/concerns/{$concern->id}", ['priority' => 'urgent', 'due_at' => $due])
            ->assertOk()
            ->assertJsonPath('data.priority', 'urgent');

        $this->assertSame($due, $concern->fresh()->due_at->toDateString());

        $this->actingAs($staff)->patchJson("/api/concerns/{$concern->id}", ['title' => 'Staff rewrote this'])
            ->assertUnprocessable()->assertJsonValidationErrors('title');
    }

    public function test_a_customer_can_withdraw_an_untouched_concern_as_a_soft_delete(): void
    {
        $customer = $this->customer($this->organization);

        $concern = Concern::findOrFail($this->actingAs($customer)->postJson('/api/concerns', [
            'title' => 'Submitted by mistake',
            'description' => 'This was a duplicate of another request.',
            'category_id' => $this->category($this->organization)->id,
        ])->assertCreated()->json('data.id'));

        $this->actingAs($customer)->deleteJson("/api/concerns/{$concern->id}")->assertNoContent();

        $this->assertSoftDeleted('concerns', ['id' => $concern->id]);
        $this->assertDatabaseHas('concern_activities', [
            'concern_id' => $concern->id, 'type' => ConcernActivity::DELETED, 'user_id' => $customer->id,
        ]);
        $this->assertDatabaseHas('concern_status_histories', ['concern_id' => $concern->id]);

        $this->actingAs($customer)->getJson("/api/concerns/{$concern->id}")->assertNotFound();
        $this->actingAs($customer)->getJson('/api/concerns')->assertJsonCount(0, 'data');
    }

    public function test_deletion_rules_are_enforced_per_role(): void
    {
        $customer = $this->customer($this->organization);
        $staff = $this->staff($this->organization);
        $admin = $this->admin($this->organization);

        $assigned = $this->concern($this->organization, $customer, ['assigned_to' => $staff->id]);
        $underway = $this->concern($this->organization, $customer, ['status' => 'under_review']);

        $this->actingAs($customer)->deleteJson("/api/concerns/{$assigned->id}")->assertForbidden();
        $this->actingAs($customer)->deleteJson("/api/concerns/{$underway->id}")->assertForbidden();
        $this->actingAs($staff)->deleteJson("/api/concerns/{$underway->id}")->assertForbidden();

        $this->assertNotSoftDeleted('concerns', ['id' => $assigned->id]);
        $this->assertNotSoftDeleted('concerns', ['id' => $underway->id]);

        $this->actingAs($admin)->deleteJson("/api/concerns/{$underway->id}")->assertNoContent();
        $this->assertSoftDeleted('concerns', ['id' => $underway->id]);
    }
}
