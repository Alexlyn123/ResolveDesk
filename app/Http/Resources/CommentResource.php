<?php

namespace App\Http\Resources;

use App\Models\ConcernComment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ConcernComment */
class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'visibility' => $this->visibility->value,
            'author' => ConcernResource::person($this->user),
            'is_own' => $this->user_id === $request->user()->id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
