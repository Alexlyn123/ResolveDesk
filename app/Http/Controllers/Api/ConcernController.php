<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConcernPriority;
use App\Http\Controllers\Controller;
use App\Http\Requests\Concerns\IndexConcernsRequest;
use App\Http\Requests\Concerns\StoreConcernRequest;
use App\Http\Requests\Concerns\UpdateConcernRequest;
use App\Http\Resources\ConcernResource;
use App\Models\Concern;
use App\Services\ConcernService;
use App\Support\OrganizationContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

class ConcernController extends Controller
{
    public function __construct(
        private OrganizationContext $context,
        private ConcernService $concerns,
    ) {}

    public function index(IndexConcernsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $membership = $this->context->membership();

        $query = Concern::query()
            ->visibleTo($membership)
            ->with(['category:id,name', 'creator:id,name,email', 'assignee:id,name,email']);

        if (filled($filters['search'] ?? null)) {
            $like = '%'.addcslashes($filters['search'], '%_\\').'%';
            $query->where(fn (Builder $inner) => $inner
                ->where('reference', 'like', $like)
                ->orWhere('title', 'like', $like));
        }

        match ($filters['status'] ?? null) {
            null, '' => null,
            'active' => $query->active(),
            default => $query->where('status', $filters['status']),
        };

        $query
            ->when($filters['category_id'] ?? null, fn (Builder $q, $id) => $q->where('category_id', $id))
            ->when($filters['priority'] ?? null, fn (Builder $q, $priority) => $q->where('priority', $priority))
            ->when($filters['created_from'] ?? null, fn (Builder $q, $date) => $q->where('created_at', '>=', Carbon::parse($date)->startOfDay()))
            ->when($filters['created_to'] ?? null, fn (Builder $q, $date) => $q->where('created_at', '<=', Carbon::parse($date)->endOfDay()))
            ->when($filters['overdue'] ?? false, fn (Builder $q) => $q->overdue());

        // Customers only ever see their own concerns, so the assignee filter is a team tool.
        if ($membership->isTeam() && filled($filters['assignee'] ?? null)) {
            match ($filters['assignee']) {
                'me' => $query->where('assigned_to', $request->user()->id),
                'unassigned' => $query->whereNull('assigned_to'),
                default => $query->where('assigned_to', (int) $filters['assignee']),
            };
        }

        $this->applySort($query, $filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc');

        return ConcernResource::collection(
            $query->paginate($filters['per_page'] ?? 15)
        );
    }

    public function store(StoreConcernRequest $request): JsonResponse
    {
        $concern = $this->concerns->create($request->user(), $this->context->membership(), $request->validated());

        return $this->detail($concern)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Concern $concern): ConcernResource
    {
        Gate::authorize('view', $concern);

        return $this->detail($concern);
    }

    public function update(UpdateConcernRequest $request, Concern $concern): ConcernResource
    {
        return $this->detail($this->concerns->update($concern, $request->user(), $request->validated()));
    }

    public function destroy(Request $request, Concern $concern): Response
    {
        Gate::authorize('delete', $concern);

        $this->concerns->delete($concern, $request->user());

        return response()->noContent();
    }

    public static function detail(Concern $concern): ConcernResource
    {
        $membership = app(OrganizationContext::class)->membership();

        $concern->load([
            'category:id,name',
            'creator:id,name,email',
            'assignee:id,name,email',
            'comments' => fn ($query) => $query->visibleTo($membership)->with('user:id,name')->oldest()->orderBy('id'),
            'statusHistories' => fn ($query) => $query->with('user:id,name')->oldest()->orderBy('id'),
            'activities' => fn ($query) => $query->with('user:id,name')->oldest()->orderBy('id'),
        ]);

        return new ConcernResource($concern);
    }

    private function applySort(Builder $query, string $sort, string $direction): void
    {
        // $sort and $direction were validated against fixed whitelists.
        match ($sort) {
            'priority' => $query->orderByRaw(ConcernPriority::rankSql('concerns.priority').' '.$direction),
            // Concerns without a target date sort last in either direction.
            'due_at' => $query->orderByRaw('concerns.due_at IS NULL')->orderBy('concerns.due_at', $direction),
            default => $query->orderBy("concerns.{$sort}", $direction),
        };

        $query->orderBy('concerns.id', 'desc');
    }
}
