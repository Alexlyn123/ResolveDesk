<?php

namespace Tests\Feature;

use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create();
    }

    public function test_organization_metrics_match_the_database(): void
    {
        $admin = $this->admin($this->organization);
        $staff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);
        $plumbing = $this->category($this->organization, ['name' => 'Plumbing']);

        $this->concern($this->organization, $customer, ['status' => 'open', 'category_id' => $plumbing->id]);
        $this->concern($this->organization, $customer, ['status' => 'open', 'category_id' => $plumbing->id]);
        $this->concern($this->organization, $customer, ['status' => 'under_review']);
        $this->concern($this->organization, $customer, ['status' => 'in_progress', 'assigned_to' => $staff->id, 'due_at' => now()->subDays(2)]);
        $this->concern($this->organization, $customer, ['status' => 'in_progress', 'assigned_to' => $staff->id, 'due_at' => now()->addDays(2)]);
        $this->concern($this->organization, $customer, ['status' => 'resolved', 'assigned_to' => $staff->id, 'resolved_at' => now()->subDays(3)]);
        $this->concern($this->organization, $customer, ['status' => 'closed', 'resolved_at' => now()->subDays(60), 'closed_at' => now()->subDays(59)]);
        // An overdue date on a finished concern is not overdue.
        $this->concern($this->organization, $customer, ['status' => 'closed', 'due_at' => now()->subDays(70), 'resolved_at' => now()->subDays(65), 'closed_at' => now()->subDays(64)]);
        // Deleted concerns are not counted.
        $this->concern($this->organization, $customer)->delete();

        $response = $this->actingAs($admin)->getJson('/api/dashboard?period=30')->assertOk();

        $response->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.metrics.total', 8)
            ->assertJsonPath('data.metrics.open', 2)
            ->assertJsonPath('data.metrics.in_progress', 2)
            ->assertJsonPath('data.metrics.resolved_in_period', 1)
            ->assertJsonPath('data.metrics.overdue', 1)
            ->assertJsonPath('data.metrics.unassigned', 3)
            ->assertJsonPath('data.status_counts.under_review', 1)
            ->assertJsonPath('data.status_counts.waiting_for_customer', 0)
            ->assertJsonPath('data.status_counts.closed', 2)
            ->assertJsonPath('data.team.customer', 1);

        $this->assertSame(
            ['name' => 'Plumbing', 'total' => 2, 'active' => 2],
            collect($response->json('data.categories'))->firstWhere('name', 'Plumbing') ? array_intersect_key(
                collect($response->json('data.categories'))->firstWhere('name', 'Plumbing'),
                ['name' => 1, 'total' => 1, 'active' => 1],
            ) : null,
        );

        $workload = collect($response->json('data.workload'))->firstWhere('user.id', $staff->id);
        $this->assertSame(2, $workload['active']);
        $this->assertSame(1, $workload['overdue']);
        $this->assertSame(1, $workload['resolved_in_period']);

        // A longer period picks up the older resolutions.
        $this->getJson('/api/dashboard?period=90')->assertJsonPath('data.metrics.resolved_in_period', 3);
        $this->getJson('/api/dashboard?period=12')->assertUnprocessable();
    }

    public function test_the_staff_dashboard_lists_their_work(): void
    {
        $staff = $this->staff($this->organization);
        $colleague = $this->staff($this->organization);
        $customer = $this->customer($this->organization);

        $mine = $this->concern($this->organization, $customer, ['status' => 'in_progress', 'assigned_to' => $staff->id, 'priority' => 'urgent']);
        $theirs = $this->concern($this->organization, $customer, ['status' => 'in_progress', 'assigned_to' => $colleague->id]);
        $unassigned = $this->concern($this->organization, $customer, ['priority' => 'high']);
        $late = $this->concern($this->organization, $customer, ['status' => 'under_review', 'assigned_to' => $colleague->id, 'due_at' => now()->subHour()]);

        $response = $this->actingAs($staff)->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.role', 'staff')
            ->assertJsonPath('data.metrics.assigned_to_me', 1)
            ->assertJsonPath('data.metrics.total', 4);

        $this->assertSame([$mine->id], $response->json('data.assigned_to_me.*.id'));
        $this->assertSame([$unassigned->id], $response->json('data.unassigned.*.id'));
        $this->assertSame([$mine->id, $unassigned->id], $response->json('data.high_priority.*.id'));
        $this->assertSame([$late->id], $response->json('data.overdue.*.id'));
        $this->assertContains($theirs->id, $response->json('data.recently_updated.*.id'));
    }

    public function test_the_customer_dashboard_only_reflects_their_own_concerns(): void
    {
        $customer = $this->customer($this->organization);
        $other = $this->customer($this->organization);
        $staff = $this->staff($this->organization);

        $this->concern($this->organization, $customer, ['status' => 'open']);
        $waiting = $this->concern($this->organization, $customer, ['status' => 'in_progress', 'assigned_to' => $staff->id]);
        $this->concern($this->organization, $customer, ['status' => 'resolved', 'resolved_at' => now()]);
        $this->concern($this->organization, $other, ['status' => 'open', 'title' => 'Somebody else entirely']);
        $this->concern($this->organization, $other, ['status' => 'resolved', 'resolved_at' => now()]);

        $this->actingAs($staff)->postJson("/api/concerns/{$waiting->id}/status", [
            'status' => 'waiting_for_customer', 'note' => 'Please confirm your unit number.',
        ])->assertOk();

        $response = $this->actingAs($customer)->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.metrics.total', 3)
            ->assertJsonPath('data.metrics.open', 1)
            ->assertJsonPath('data.metrics.in_progress', 1)
            ->assertJsonPath('data.metrics.resolved', 1)
            ->assertJsonPath('data.metrics.awaiting_response', 1)
            ->assertJsonCount(3, 'data.recent')
            ->assertJsonPath('data.needs_response.0.id', $waiting->id)
            ->assertJsonPath('data.updates.0.new_status', 'waiting_for_customer')
            ->assertJsonPath('data.updates.0.note', 'Please confirm your unit number.')
            ->assertDontSee('Somebody else entirely');

        // Organization-wide figures are not part of the customer payload at all.
        $response->assertJsonMissingPath('data.workload')
            ->assertJsonMissingPath('data.metrics.unassigned')
            ->assertJsonMissingPath('data.categories');
    }

    public function test_reports_are_for_the_team_and_reflect_real_activity(): void
    {
        $staff = $this->staff($this->organization);
        $customer = $this->customer($this->organization);

        $this->concern($this->organization, $customer, ['created_at' => now()->subDays(2)]);
        $this->concern($this->organization, $customer, [
            'status' => 'resolved', 'created_at' => now()->subDays(3), 'resolved_at' => now()->subDays(3)->addHours(12),
        ]);
        $this->concern($this->organization, $customer, [
            'status' => 'closed', 'created_at' => now()->subDays(50), 'resolved_at' => now()->subDays(48), 'closed_at' => now()->subDays(47),
        ]);

        $this->actingAs($customer)->getJson('/api/reports/summary')->assertForbidden();

        $response = $this->actingAs($staff)->getJson('/api/reports/summary?period=7')->assertOk()
            ->assertJsonPath('data.totals.created', 2)
            ->assertJsonPath('data.totals.resolved', 1)
            ->assertJsonPath('data.totals.active_now', 1)
            ->assertJsonPath('data.totals.average_resolution_hours', 12)
            ->assertJsonCount(7, 'data.series');

        $this->assertSame(2, array_sum($response->json('data.series.*.created')));
        $this->assertSame(1, $response->json('data.priorities.medium'));
    }
}
