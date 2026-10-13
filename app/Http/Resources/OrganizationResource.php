<?php

namespace App\Http\Resources;

use App\Models\Organization;
use App\Support\OrganizationContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Organization */
class OrganizationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $membership = app(OrganizationContext::class)->membershipFor($request->user(), $this->id);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'status' => $this->status,
            // The code that lets new customers join is for administrators to hand out.
            'join_code' => $this->when((bool) $membership?->isAdmin(), $this->join_code),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
