<?php

namespace Database\Seeders;

use App\Enums\MemberRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Services\OrganizationService;
use Illuminate\Database\Seeder;

class StarterSeeder extends Seeder
{
    public const PASSWORD = 'password';

    private const STAFF = [
        'Ben10' => 'ben10@resolvedesk.test',
        'Guko' => 'guko@resolvedesk.test',
        'Dino' => 'dino@resolvedesk.test',
        'Barney' => 'barney@resolvedesk.test',
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new \RuntimeException('Starter accounts use a published password and must not be seeded in production.');
        }

        $organizations = app(OrganizationService::class);

        $admin = User::firstOrCreate(
            ['email' => 'admin@resolvedesk.test'],
            ['name' => 'Administrator', 'password' => self::PASSWORD],
        );

        $organization = Organization::where('slug', 'northgate-residences')->first()
            ?? $organizations->create($admin, 'Northgate Residences');

        if ($organization->wasRecentlyCreated || $organization->slug !== 'northgate-residences') {
            $organization->forceFill(['slug' => 'northgate-residences'])->save();
        }

        foreach (self::STAFF as $name => $email) {
            $user = User::firstOrCreate(['email' => $email], ['name' => $name, 'password' => self::PASSWORD]);

            if (! Membership::where('organization_id', $organization->id)->where('user_id', $user->id)->exists()) {
                $organizations->addMember($organization, $user, MemberRole::Staff);
            }

            $user->forceFill(['current_organization_id' => $organization->id])->save();
        }

        $this->command?->info('Workspace ready: 1 administrator and '.count(self::STAFF).' staff.');
    }
}
