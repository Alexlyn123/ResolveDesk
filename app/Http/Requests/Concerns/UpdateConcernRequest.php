<?php

namespace App\Http\Requests\Concerns;

use App\Enums\ConcernPriority;
use App\Support\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateConcernRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Gate::authorize keeps the policy's own response: 404 across workspaces, 403 with a reason otherwise.
        return Gate::authorize('update', $this->route('concern'))->allowed();
    }

    public function rules(): array
    {
        $context = app(OrganizationContext::class);
        $membership = $context->membership();
        $concern = $this->route('concern');

        // The submitter's own words are only changed by the submitter or an administrator.
        $canEditText = $concern->created_by === $this->user()->id || $membership->isAdmin();

        return [
            'title' => $canEditText ? ['sometimes', 'required', 'string', 'min:5', 'max:150'] : ['prohibited'],
            'description' => $canEditText ? ['sometimes', 'required', 'string', 'min:10', 'max:5000'] : ['prohibited'],
            'category_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('categories', 'id')
                    ->where('organization_id', $context->organization()->id)
                    // An existing concern may keep a category that was later retired.
                    ->where(fn ($query) => $query->where('is_active', true)->orWhere('id', $concern->category_id)),
            ],
            'priority' => ['sometimes', 'required', Rule::enum(ConcernPriority::class)],
            'due_at' => $membership->isTeam() ? ['sometimes', 'nullable', 'date'] : ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'Choose one of the available categories.',
            'title.prohibited' => 'Only the person who submitted this concern can change its wording.',
            'description.prohibited' => 'Only the person who submitted this concern can change its wording.',
            'due_at.prohibited' => 'Target dates are set by the team handling your concern.',
        ];
    }
}
