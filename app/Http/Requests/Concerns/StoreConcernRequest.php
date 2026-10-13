<?php

namespace App\Http\Requests\Concerns;

use App\Enums\ConcernPriority;
use App\Models\Concern;
use App\Support\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreConcernRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Concern::class);
    }

    public function rules(): array
    {
        $context = app(OrganizationContext::class);

        return [
            'title' => ['required', 'string', 'min:5', 'max:150'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')
                    ->where('organization_id', $context->organization()->id)
                    ->where('is_active', true),
            ],
            'priority' => ['sometimes', Rule::enum(ConcernPriority::class)],
            // Only the team sets target dates.
            'due_at' => $context->membership()->isTeam()
                ? ['sometimes', 'nullable', 'date', 'after_or_equal:today']
                : ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'Choose one of the available categories.',
            'due_at.prohibited' => 'Target dates are set by the team handling your concern.',
        ];
    }
}
