<?php

namespace App\Services;

use App\Enums\ConcernPriority;
use App\Enums\ConcernStatus;
use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Http\Resources\ConcernResource;
use App\Http\Resources\StatusHistoryResource;
use App\Models\Concern;
use App\Models\ConcernStatusHistory;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class DashboardService
{
    private const LIST_LIMIT = 6;

    public function build(User $user, Membership $membership, int $days): array
    {
        $since = now()->subDays($days)->startOfDay();

        $payload = match ($membership->role) {
            MemberRole::Admin => $this->admin($user, $membership, $since),
            MemberRole::Staff => $this->staff($user, $membership, $since),
            MemberRole::Customer => $this->customer($user, $membership),
        };

        return ['role' => $membership->role->value, 'period_days' => $days, ...$payload];
    }

    private function customer(User $user, Membership $membership): array
    {
        $counts = $this->statusCounts($this->scope($membership));

        return [
            'metrics' => [
                'total' => array_sum($counts),
                'open' => $counts['open'] + $counts['under_review'],
                'in_progress' => $counts['in_progress'] + $counts['waiting_for_customer'],
                'resolved' => $counts['resolved'] + $counts['closed'],
                'awaiting_response' => $counts['waiting_for_customer'],
            ],
            'status_counts' => $counts,
            'needs_response' => $this->concerns(
                $this->scope($membership)->where('status', ConcernStatus::WaitingForCustomer)->latest('updated_at')
            ),
            'recent' => $this->concerns($this->scope($membership)->latest()),
            // Status changes made by the team on this customer's concerns.
            'updates' => StatusHistoryResource::collection(
                ConcernStatusHistory::query()
                    ->whereIn('concern_id', $this->scope($membership)->select('id'))
                    ->where('changed_by', '!=', $user->id)
                    ->with(['user:id,name', 'concern:id,reference,title'])
                    ->latest()->orderByDesc('id')
                    ->limit(self::LIST_LIMIT)
                    ->get()
            ),
        ];
    }

    private function staff(User $user, Membership $membership, Carbon $since): array
    {
        $prioritised = fn (Builder $query) => $query
            ->orderByRaw(ConcernPriority::rankSql().' DESC')
            ->oldest();

        return [
            'metrics' => $this->organizationMetrics($membership, $since) + [
                'assigned_to_me' => $this->scope($membership)->active()->where('assigned_to', $user->id)->count(),
            ],
            'status_counts' => $this->statusCounts($this->scope($membership)),
            'assigned_to_me' => $this->concerns($prioritised(
                $this->scope($membership)->active()->where('assigned_to', $user->id)
            )),
            'unassigned' => $this->concerns($prioritised(
                $this->scope($membership)->active()->whereNull('assigned_to')
            )),
            'high_priority' => $this->concerns($prioritised(
                $this->scope($membership)->active()->whereIn('priority', [ConcernPriority::High, ConcernPriority::Urgent])
            )),
            'overdue' => $this->concerns($this->scope($membership)->overdue()->orderBy('due_at')),
            'recently_updated' => $this->concerns($this->scope($membership)->latest('updated_at')),
        ];
    }

    private function admin(User $user, Membership $membership, Carbon $since): array
    {
        $organizationId = $membership->organization_id;

        return [
            'metrics' => $this->organizationMetrics($membership, $since),
            'status_counts' => $this->statusCounts($this->scope($membership)),
            'categories' => $this->categoryDistribution($organizationId),
            'workload' => $this->workload($organizationId, $since),
            'team' => Membership::where('organization_id', $organizationId)
                ->where('status', MembershipStatus::Active)
                ->toBase()
                ->selectRaw('role, COUNT(*) as total')
                ->groupBy('role')
                ->pluck('total', 'role')
                ->map(fn ($total) => (int) $total),
            'unassigned' => $this->concerns(
                $this->scope($membership)->active()->whereNull('assigned_to')
                    ->orderByRaw(ConcernPriority::rankSql().' DESC')->oldest()
            ),
            'overdue' => $this->concerns($this->scope($membership)->overdue()->orderBy('due_at')),
            'recent_activity' => StatusHistoryResource::collection(
                ConcernStatusHistory::query()
                    ->whereIn('concern_id', $this->scope($membership)->select('id'))
                    ->with(['user:id,name', 'concern:id,reference,title'])
                    ->latest()->orderByDesc('id')
                    ->limit(8)
                    ->get()
            ),
        ];
    }

    private function organizationMetrics(Membership $membership, Carbon $since): array
    {
        $counts = $this->statusCounts($this->scope($membership));

        return [
            'total' => array_sum($counts),
            'open' => $counts['open'],
            'in_progress' => $counts['in_progress'],
            'resolved_in_period' => $this->scope($membership)->where('resolved_at', '>=', $since)->count(),
            'overdue' => $this->scope($membership)->overdue()->count(),
            'unassigned' => $this->scope($membership)->active()->whereNull('assigned_to')->count(),
        ];
    }

    /** @return array<string, int> every status, including those with no concerns */
    public function statusCounts(Builder $query): array
    {
        $counts = $query->toBase()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return collect(ConcernStatus::values())
            ->mapWithKeys(fn (string $status) => [$status => (int) ($counts[$status] ?? 0)])
            ->all();
    }

    public function categoryDistribution(int $organizationId, ?Carbon $since = null): array
    {
        $active = "'".implode("','", ConcernStatus::activeValues())."'";

        return Concern::query()
            ->where('concerns.organization_id', $organizationId)
            ->when($since, fn (Builder $query) => $query->where('concerns.created_at', '>=', $since))
            ->join('categories', 'categories.id', '=', 'concerns.category_id')
            ->toBase()
            ->selectRaw("categories.id, categories.name, COUNT(*) as total, SUM(CASE WHEN concerns.status IN ({$active}) THEN 1 ELSE 0 END) as active")
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'total' => (int) $row->total,
                'active' => (int) $row->active,
            ])
            ->all();
    }

    private function workload(int $organizationId, Carbon $since): array
    {
        $active = "'".implode("','", ConcernStatus::activeValues())."'";

        $rows = Concern::query()
            ->where('organization_id', $organizationId)
            ->whereNotNull('assigned_to')
            ->toBase()
            ->selectRaw(
                "assigned_to,
                SUM(CASE WHEN status IN ({$active}) THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status IN ({$active}) AND due_at IS NOT NULL AND due_at < ? THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN resolved_at >= ? THEN 1 ELSE 0 END) as resolved",
                [now(), $since],
            )
            ->groupBy('assigned_to')
            ->get()
            ->keyBy('assigned_to');

        return Membership::query()
            ->where('organization_id', $organizationId)
            ->where('status', MembershipStatus::Active)
            ->whereIn('role', [MemberRole::Staff, MemberRole::Admin])
            ->with('user:id,name')
            ->get()
            ->map(fn (Membership $member) => [
                'user' => ['id' => $member->user->id, 'name' => $member->user->name],
                'role' => $member->role->value,
                'active' => (int) ($rows[$member->user_id]->active ?? 0),
                'overdue' => (int) ($rows[$member->user_id]->overdue ?? 0),
                'resolved_in_period' => (int) ($rows[$member->user_id]->resolved ?? 0),
            ])
            ->sortByDesc('active')
            ->values()
            ->all();
    }

    private function scope(Membership $membership): Builder
    {
        return Concern::query()->visibleTo($membership);
    }

    private function concerns(Builder $query)
    {
        return ConcernResource::collection(
            $query->with(['category:id,name', 'creator:id,name,email', 'assignee:id,name,email'])
                ->limit(self::LIST_LIMIT)
                ->get()
        );
    }
}
