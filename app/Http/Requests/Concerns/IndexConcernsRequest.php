<?php

namespace App\Http\Requests\Concerns;

use App\Enums\ConcernPriority;
use App\Enums\ConcernStatus;
use App\Models\Concern;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexConcernsRequest extends FormRequest
{
    public const SORTS = ['created_at', 'updated_at', 'priority', 'due_at'];

    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Concern::class);
    }

    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'status' => ['sometimes', 'nullable', Rule::in([...ConcernStatus::values(), 'active'])],
            'category_id' => ['sometimes', 'nullable', 'integer'],
            'priority' => ['sometimes', 'nullable', Rule::enum(ConcernPriority::class)],
            'assignee' => ['sometimes', 'nullable', 'string', 'regex:/^(me|unassigned|\d{1,18})$/'],
            'created_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'created_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
            'overdue' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', Rule::in(self::SORTS)],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'min:5', 'max:50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
