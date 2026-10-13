<?php

namespace App\Http\Resources;

use App\Models\Membership;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class SessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $current = $this->resolveCurrentMembership();

        $memberships = $this->activeMemberships()->with('organization')->orderBy('id')->get();

        return [
            'user' => [
                'id' => $this->id,
                'name' => $this->name,
                'email' => $this->email,
            ],
            'organizations' => $memberships->map(fn (Membership $membership) => [
                'id' => $membership->organization->id,
                'name' => $membership->organization->name,
                'slug' => $membership->organization->slug,
                'role' => $membership->role->value,
            ])->values(),
            'current' => $current ? [
                'organization' => [
                    'id' => $current->organization->id,
                    'name' => $current->organization->name,
                    'slug' => $current->organization->slug,
                ],
                'role' => $current->role->value,
                'role_label' => $current->role->label(),
            ] : null,
        ];
    }
}
