<?php

namespace App\Http\Requests\Concerns;

use App\Enums\CommentVisibility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::authorize('comment', $this->route('concern'))->allowed();
    }

    public function rules(): array
    {
        $allowed = $this->user()->can('commentInternally', $this->route('concern'))
            ? CommentVisibility::values()
            : [CommentVisibility::Public->value];

        return [
            'body' => ['required', 'string', 'min:2', 'max:4000'],
            'visibility' => ['sometimes', Rule::in($allowed)],
        ];
    }

    public function messages(): array
    {
        return [
            'visibility.in' => 'You cannot post internal notes on this concern.',
        ];
    }
}
