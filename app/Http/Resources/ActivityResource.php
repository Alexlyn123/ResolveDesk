<?php

namespace App\Http\Resources;

use App\Models\ConcernActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ConcernActivity */
class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'properties' => $this->properties ?? (object) [],
            'actor' => ConcernResource::person($this->user),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
