<?php

namespace Tests\Feature;

use App\Enums\ConcernStatus;
use App\Models\Concern;
use App\Models\ConcernActivity;
use App\Models\ConcernStatusHistory;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

class ConcernWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $customer;

    private User $staff;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create();
        $this->customer = $this->customer($this->organization);
        $this->staff = $this->staff($this->organization);
        $this->admin = $this->admin($this->organization);
    }

    private function changeStatus(User $user, Concern $concern, string $status, ?string $note = null)
    {
        return $this->actingAs($user)->postJson("/api/concerns/{$concern->id}/status", array_filter([
            'status' => $status,
            'note' => $note,
        ]));
    }

    public function test_the_full_lifecycle_is_recorded_step_by_step(): void
    {
        $concern = $this->concern($this->organization, $this->customer);

        $this->actingAs($this->staff)->postJson("/api/concerns/{$concern->id}/assign", ['assigned_to' => $this->staff->id])
            ->assertOk()->assertJsonPath('data.assignee.id', $this->staff->id);

        $this->changeStatus($this->staff, $concern, 'under_review')->assertOk();
        $this->changeStatus($this->staff, $concern, 'in_progress')->assertOk();
        $this->changeStatus($this->staff, $concern, 'resolved', 'Replaced the faulty valve and tested it.')
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.resolution_note', 'Replaced the faulty valve and tested it.');

        $this->assertNotNull($concern->fresh()->resolved_at);
        $this->assertNull($concern->fresh()->closed_at);

        // The customer confirms the resolution: closing is a separate step.
        $this->changeStatus($this->customer, $concern, 'closed')->assertOk()->assertJsonPath('data.status', 'closed');
        $this->assertNotNull($concern->fresh()->closed_at);

        $history = ConcernStatusHistory::where('concern_id', $concern->id)->orderBy('id')->get();

        $this->assertSame(
            [['open', 'under_review'], ['under_review', 'in_progress'], ['in_progress', 'resolved'], ['resolved', 'closed']],
            $history->map(fn ($entry) => [$entry->old_status->value, $entry->new_status->value])->all(),
        );
        $this->assertSame($this->customer->id, $history->last()->changed_by);
        $this->assertSame('Replaced the faulty valve and tested it.', $history[2]->note);
    }

    public function test_invalid_transitions_are_rejected(): void
    {
        $concern = $this->concern($this->organization, $this->customer);

        // Open cannot jump straight to resolved or to waiting for the customer.
        $this->changeStatus($this->staff, $concern, 'resolved', 'Skipping every step in between.')
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->changeStatus($this->staff, $concern, 'waiting_for_customer', 'Need more details please.')
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->changeStatus($this->staff, $concern, 'open')->assertUnprocessable();
        $this->changeStatus($this->staff, $concern, 'not_a_status')->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->assertSame(ConcernStatus::Open, $concern->fresh()->status);
        $this->assertDatabaseCount('concern_status_histories', 0);
    }

    public function test_resolving_requires_a_resolution_note(): void
    {
        $concern = $this->concern($this->organization, $this->customer, ['status' => 'in_progress']);

        $this->changeStatus($this->staff, $concern, 'resolved')->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->changeStatus($this->staff, $concern, 'resolved', 'Fixed.')->assertUnprocessable()->assertJsonValidationErrors('note');

        $this->assertSame(ConcernStatus::InProgress, $concern->fresh()->status);
    }

    public function test_closing_without_a_resolution_requires_a_reason(): void
    {
        $concern = $this->concern($this->organization, $this->customer);

        $this->changeStatus($this->staff, $concern, 'closed')->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->changeStatus($this->staff, $concern, 'closed', 'Duplicate of an earlier report.')->assertOk();

        $this->assertNull($concern->fresh()->resolved_at);
        $this->assertNotNull($concern->fresh()->closed_at);
    }

    public function test_customers_cannot_drive_the_workflow(): void
    {
        $concern = $this->concern($this->organization, $this->customer);

        foreach (['under_review', 'in_progress', 'resolved', 'closed'] as $status) {
            $this->changeStatus($this->customer, $concern, $status, 'I would like to decide this myself.')->assertForbidden();
        }

        $this->assertSame(ConcernStatus::Open, $concern->fresh()->status);
    }

    public function test_a_customer_cannot_close_someone_elses_resolved_concern(): void
    {
        $other = $this->customer($this->organization);
        $concern = $this->concern($this->organization, $other, ['status' => 'resolved', 'resolved_at' => now()]);

        $this->changeStatus($this->customer, $concern, 'closed')->assertForbidden();
    }

    public function test_staff_cannot_change_a_concern_owned_by_a_colleague_but_admins_can(): void
    {
        $colleague = $this->staff($this->organization);
        $concern = $this->concern($this->organization, $this->customer, ['assigned_to' => $colleague->id, 'status' => 'under_review']);

        $this->changeStatus($this->staff, $concern, 'in_progress')->assertForbidden();
        $this->actingAs($this->staff)->patchJson("/api/concerns/{$concern->id}", ['priority' => 'low'])->assertForbidden();

        $this->changeStatus($this->admin, $concern, 'in_progress')->assertOk();
    }

    public function test_only_an_administrator_can_reopen_a_closed_concern(): void
    {
        $concern = $this->concern($this->organization, $this->customer, [
            'status' => 'closed', 'resolved_at' => now(), 'closed_at' => now(), 'resolution_note' => 'Done earlier.',
        ]);

        $this->changeStatus($this->staff, $concern, 'in_progress', 'Reopening this one.')->assertForbidden();
        $this->changeStatus($this->admin, $concern, 'in_progress')->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->changeStatus($this->admin, $concern, 'in_progress', 'The fault has returned.')->assertOk();

        $concern->refresh();
        $this->assertSame(ConcernStatus::InProgress, $concern->status);
        $this->assertNull($concern->resolved_at);
        $this->assertNull($concern->closed_at);
        $this->assertNull($concern->resolution_note);
    }

    public function test_only_the_team_can_assign_and_only_to_team_members_of_the_workspace(): void
    {
        $concern = $this->concern($this->organization, $this->customer);
        $outsider = $this->staff(Organization::factory()->create());

        $this->actingAs($this->customer)->postJson("/api/concerns/{$concern->id}/assign", ['assigned_to' => $this->staff->id])
            ->assertForbidden();

        // Not to a customer, not to staff of another workspace, not to a nonexistent user.
        foreach ([$this->customer->id, $outsider->id, 999999] as $invalid) {
            $this->actingAs($this->staff)->postJson("/api/concerns/{$concern->id}/assign", ['assigned_to' => $invalid])
                ->assertUnprocessable()->assertJsonValidationErrors('assigned_to');
        }

        $this->assertNull($concern->fresh()->assigned_to);

        $this->actingAs($this->admin)->postJson("/api/concerns/{$concern->id}/assign", ['assigned_to' => $this->staff->id])->assertOk();
        $this->assertSame($this->staff->id, $concern->fresh()->assigned_to);
        $this->assertDatabaseHas('concern_activities', ['concern_id' => $concern->id, 'type' => ConcernActivity::ASSIGNED, 'user_id' => $this->admin->id]);
        $this->assertSame(1, $this->staff->notifications()->count());

        $this->actingAs($this->admin)->postJson("/api/concerns/{$concern->id}/assign", ['assigned_to' => null])->assertOk();
        $this->assertNull($concern->fresh()->assigned_to);
        $this->assertDatabaseHas('concern_activities', ['concern_id' => $concern->id, 'type' => ConcernActivity::UNASSIGNED]);
    }

    public function test_private_staff_notes_are_never_returned_to_customers(): void
    {
        $concern = $this->concern($this->organization, $this->customer, ['assigned_to' => $this->staff->id, 'status' => 'in_progress']);

        $this->actingAs($this->staff)->postJson("/api/concerns/{$concern->id}/comments", [
            'body' => 'INTERNAL: suspected contractor fault, do not share.', 'visibility' => 'internal',
        ])->assertCreated()->assertJsonPath('data.visibility', 'internal');

        $this->actingAs($this->staff)->postJson("/api/concerns/{$concern->id}/comments", [
            'body' => 'We have scheduled a visit for tomorrow.',
        ])->assertCreated()->assertJsonPath('data.visibility', 'public');

        // Detail endpoint.
        $detail = $this->actingAs($this->customer)->getJson("/api/concerns/{$concern->id}")->assertOk();
        $detail->assertJsonCount(1, 'data.comments')->assertJsonPath('data.comments.0.body', 'We have scheduled a visit for tomorrow.');
        $this->assertStringNotContainsString('INTERNAL', $detail->getContent());

        // Comments endpoint.
        $list = $this->actingAs($this->customer)->getJson("/api/concerns/{$concern->id}/comments")->assertOk()->assertJsonCount(1, 'data');
        $this->assertStringNotContainsString('INTERNAL', $list->getContent());

        // Notifications and dashboard do not leak it either.
        $this->assertStringNotContainsString('INTERNAL', $this->getJson('/api/notifications')->getContent());
        $this->assertStringNotContainsString('INTERNAL', $this->getJson('/api/dashboard')->getContent());
        $this->assertSame(1, $this->customer->notifications()->count());

        // The team sees both.
        $this->actingAs($this->admin)->getJson("/api/concerns/{$concern->id}")->assertJsonCount(2, 'data.comments');
    }

    public function test_customers_cannot_post_internal_notes_or_comment_on_others_concerns(): void
    {
        $concern = $this->concern($this->organization, $this->customer);
        $other = $this->customer($this->organization);

        $this->actingAs($this->customer)->postJson("/api/concerns/{$concern->id}/comments", [
            'body' => 'Trying to write a private note.', 'visibility' => 'internal',
        ])->assertUnprocessable()->assertJsonValidationErrors('visibility');

        $this->actingAs($other)->postJson("/api/concerns/{$concern->id}/comments", ['body' => 'Not my concern.'])
            ->assertForbidden();

        $this->assertDatabaseCount('concern_comments', 0);
    }

    public function test_a_customer_reply_returns_a_waiting_concern_to_the_team(): void
    {
        $concern = $this->concern($this->organization, $this->customer, ['assigned_to' => $this->staff->id, 'status' => 'in_progress']);

        $this->changeStatus($this->staff, $concern, 'waiting_for_customer')->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->changeStatus($this->staff, $concern, 'waiting_for_customer', 'Which unit number is affected?')->assertOk();

        $this->actingAs($this->customer)->postJson("/api/concerns/{$concern->id}/comments", ['body' => 'It is unit 4B.'])
            ->assertCreated();

        $this->assertSame(ConcernStatus::InProgress, $concern->fresh()->status);
        $this->assertDatabaseHas('concern_status_histories', [
            'concern_id' => $concern->id,
            'old_status' => 'waiting_for_customer',
            'new_status' => 'in_progress',
            'changed_by' => $this->customer->id,
        ]);
    }

    public function test_closed_concerns_accept_no_further_comments_or_edits(): void
    {
        $concern = $this->concern($this->organization, $this->customer, ['status' => 'closed', 'closed_at' => now()]);

        $this->actingAs($this->staff)->postJson("/api/concerns/{$concern->id}/comments", ['body' => 'One more thing.'])->assertForbidden();
        $this->actingAs($this->admin)->patchJson("/api/concerns/{$concern->id}", ['priority' => 'low'])->assertForbidden();
        $this->actingAs($this->admin)->postJson("/api/concerns/{$concern->id}/assign", ['assigned_to' => $this->staff->id])->assertForbidden();
    }

    public function test_status_history_is_append_only(): void
    {
        $concern = $this->concern($this->organization, $this->customer);
        $this->changeStatus($this->staff, $concern, 'under_review')->assertOk();

        $entry = ConcernStatusHistory::firstOrFail();

        $this->expectException(LogicException::class);
        $entry->forceFill(['note' => 'Rewritten after the fact.'])->save();
    }

    public function test_the_customer_is_notified_of_status_changes(): void
    {
        $concern = $this->concern($this->organization, $this->customer);

        $this->changeStatus($this->staff, $concern, 'under_review')->assertOk();

        $this->actingAs($this->customer)->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 1)
            ->assertJsonPath('data.0.data.concern_id', $concern->id);

        $this->postJson('/api/notifications/read-all')->assertNoContent();
        $this->getJson('/api/notifications')->assertJsonPath('meta.unread_count', 0);

        // The person who made the change is not notified about it.
        $this->assertSame(0, $this->staff->notifications()->count());
    }
}
