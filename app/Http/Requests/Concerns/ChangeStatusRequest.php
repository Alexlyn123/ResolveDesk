<?php

namespace App\Http\Requests\Concerns;

use App\Enums\ConcernStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ChangeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::authorize('changeStatus', $this->route('concern'))->allowed();
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ConcernStatus::class)],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
