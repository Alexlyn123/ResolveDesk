<?php

namespace Tests\Feature;

use App\Enums\MemberRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Nia Santos',
            'email' => 'nia@example.com',
            'password' => 'Secret-pass1',
            'password_confirmation' => 'Secret-pass1',
        ];
    }

    public function test_a_visitor_can_register_and_is_signed_in(): void
    {
        $response = $this->fromSpa()->postJson('/api/register', $this->registration());

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'nia@example.com')
            ->assertJsonPath('data.current', null)
            ->assertJsonMissingPath('data.user.password');

        $user = User::where('email', 'nia@example.com')->firstOrFail();

        $this->assertTrue(Hash::check('Secret-pass1', $user->password));
        $this->assertNotSame('Secret-pass1', $user->password);
        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_registration_with_a_workspace_code_joins_as_customer(): void
    {
        $organization = Organization::factory()->create(['join_code' => 'JOIN-ME-NOW']);

        $this->fromSpa()->postJson('/api/register', $this->registration(['workspace_code' => 'join-me-now']))
            ->assertCreated()
            ->assertJsonPath('data.current.organization.id', $organization->id)
            ->assertJsonPath('data.current.role', 'customer');
    }

    public function test_registration_rejects_an_unknown_workspace_code_without_creating_an_account(): void
    {
        $this->fromSpa()->postJson('/api/register', $this->registration(['workspace_code' => 'NOPE']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('workspace_code');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_cannot_be_used_to_claim_a_privileged_role(): void
    {
        $organization = Organization::factory()->create(['join_code' => 'JOIN-ME-NOW']);

        $this->fromSpa()->postJson('/api/register', $this->registration([
            'workspace_code' => 'JOIN-ME-NOW',
            'role' => 'admin',
            'is_admin' => true,
            'organization_id' => $organization->id,
            'memberships' => [['organization_id' => $organization->id, 'role' => 'admin']],
        ]))->assertCreated()->assertJsonPath('data.current.role', 'customer');

        $this->assertSame(
            [MemberRole::Customer],
            Membership::where('organization_id', $organization->id)->get()->pluck('role')->all(),
        );
    }

    public function test_registration_validates_its_input(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->fromSpa()->postJson('/api/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);

        $this->fromSpa()->postJson('/api/register', $this->registration(['email' => 'TAKEN@example.com']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_a_user_can_sign_in_and_retrieve_their_session(): void
    {
        $organization = Organization::factory()->create();
        $user = $this->staff($organization);

        $this->fromSpa()->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.current.role', 'staff');

        $this->assertAuthenticatedAs($user, 'web');

        $this->fromSpa()->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonPath('data.organizations.0.id', $organization->id);
    }

    public function test_sign_in_fails_with_wrong_credentials(): void
    {
        $user = User::factory()->create();

        $this->fromSpa()->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertGuest('web');
    }

    public function test_repeated_failed_sign_ins_are_rate_limited(): void
    {
        $user = User::factory()->create();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->fromSpa()->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])
                ->assertUnprocessable();
        }

        $this->fromSpa()->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
            ->assertTooManyRequests();
    }

    public function test_a_user_can_sign_out(): void
    {
        $user = User::factory()->create();

        $this->fromSpa()->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
        $this->fromSpa()->postJson('/api/logout')->assertNoContent();

        $this->assertGuest('web');

        $this->app['auth']->forgetGuards();
        $this->fromSpa()->getJson('/api/user')->assertUnauthorized();
    }

    public function test_protected_endpoints_require_authentication(): void
    {
        foreach (['/api/user', '/api/concerns', '/api/dashboard', '/api/categories', '/api/members', '/api/notifications'] as $uri) {
            $this->getJson($uri)->assertUnauthorized();
        }

        $this->postJson('/api/concerns', [])->assertUnauthorized();
    }

    public function test_a_user_without_a_workspace_cannot_reach_workspace_data(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/api/concerns')
            ->assertForbidden()
            ->assertJsonPath('code', 'no_organization');
    }

    public function test_a_user_can_update_their_profile_and_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patchJson('/api/profile', ['name' => 'New Name', 'email' => 'new@example.com'])
            ->assertOk()
            ->assertJsonPath('data.user.name', 'New Name');

        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'wrong',
            'password' => 'Another-pass2',
            'password_confirmation' => 'Another-pass2',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');

        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'Another-pass2',
            'password_confirmation' => 'Another-pass2',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('Another-pass2', $user->fresh()->password));
    }
}
