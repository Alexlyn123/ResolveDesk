<?php

namespace App\Http\Resources;

use App\Models\ConcernStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ConcernStatusHistory */
class StatusHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'old_status' => $this->old_status?->value,
            'new_status' => $this->new_status->value,
            'note' => $this->note,
            'changed_by' => ConcernResource::person($this->user),
            'created_at' => $this->created_at?->toIso8601String(),
            'concern' => $this->whenLoaded('concern', fn () => [
                'id' => $this->concern->id,
                'reference' => $this->concern->reference,
                'title' => $this->concern->title,
            ]),
        ];
    }
}
