<?php

namespace App\Http\Requests\Concerns;

use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Support\OrganizationContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AssignConcernRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::authorize('assign', $this->route('concern'))->allowed();
    }

    public function rules(): array
    {
        return [
            // null unassigns. Otherwise: an active staff member or administrator of this workspace.
            'assigned_to' => [
                'present',
                'nullable',
                'integer',
                Rule::exists('organization_user', 'user_id')
                    ->where('organization_id', app(OrganizationContext::class)->organization()->id)
                    ->where('status', MembershipStatus::Active->value)
                    ->whereIn('role', [MemberRole::Staff->value, MemberRole::Admin->value]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'assigned_to.exists' => 'Concerns can only be assigned to active team members of this workspace.',
        ];
    }
}
