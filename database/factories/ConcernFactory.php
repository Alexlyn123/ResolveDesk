<?php

namespace Database\Factories;

use App\Enums\ConcernPriority;
use App\Enums\ConcernStatus;
use App\Models\Category;
use App\Models\Concern;
use App\Models\Organization;
use App\Models\User;
use App\Services\TicketReferenceGenerator;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Concern> */
class ConcernFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => fn () => app(TicketReferenceGenerator::class)->next(),
            'organization_id' => Organization::factory(),
            'created_by' => User::factory(),
            'assigned_to' => null,
            'category_id' => fn (array $attributes) => Category::factory()->state([
                'organization_id' => $attributes['organization_id'],
            ]),
            'title' => rtrim(fake()->sentence(5), '.'),
            'description' => fake()->paragraph(),
            'priority' => ConcernPriority::Medium,
            'status' => ConcernStatus::Open,
        ];
    }

    public function status(ConcernStatus $status): static
    {
        return $this->state(fn () => [
            'status' => $status,
            'resolved_at' => in_array($status, [ConcernStatus::Resolved, ConcernStatus::Closed], true) ? now() : null,
            'closed_at' => $status === ConcernStatus::Closed ? now() : null,
            'resolution_note' => $status === ConcernStatus::Resolved ? 'Resolved during testing.' : null,
        ]);
    }
}
