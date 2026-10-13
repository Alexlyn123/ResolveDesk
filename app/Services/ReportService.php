<?php

namespace App\Services;

use App\Enums\ConcernPriority;
use App\Http\Resources\ConcernResource;
use App\Models\Concern;
use App\Models\Membership;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class ReportService
{
    public function __construct(private DashboardService $dashboard) {}

    public function summary(Membership $membership, int $days): array
    {
        $since = now()->subDays($days - 1)->startOfDay();
        $scope = fn (): Builder => Concern::query()->where('organization_id', $membership->organization_id);

        $created = $this->perDay($scope(), 'created_at', $since);
        $resolved = $this->perDay($scope(), 'resolved_at', $since);

        $series = collect(CarbonPeriod::create($since, now()->startOfDay()))
            ->map(fn (CarbonInterface $day) => [
                'date' => $day->toDateString(),
                'created' => (int) ($created[$day->toDateString()] ?? 0),
                'resolved' => (int) ($resolved[$day->toDateString()] ?? 0),
            ])
            ->values();

        // Computed in PHP so the figure is identical on every database engine.
        $durations = $scope()->where('resolved_at', '>=', $since)
            ->toBase()
            ->get(['created_at', 'resolved_at'])
            ->map(fn ($row) => Carbon::parse($row->created_at)->diffInMinutes(Carbon::parse($row->resolved_at)) / 60);

        $priorities = $scope()->active()->toBase()
            ->selectRaw('priority, COUNT(*) as total')
            ->groupBy('priority')
            ->pluck('total', 'priority');

        return [
            'period_days' => $days,
            'from' => $since->toDateString(),
            'to' => now()->toDateString(),
            'totals' => [
                'created' => $series->sum('created'),
                'resolved' => $series->sum('resolved'),
                'active_now' => $scope()->active()->count(),
                'overdue_now' => $scope()->overdue()->count(),
                'average_resolution_hours' => $durations->isEmpty() ? null : round($durations->avg(), 1),
            ],
            'series' => $series,
            'status_counts' => $this->dashboard->statusCounts($scope()),
            'priorities' => collect(ConcernPriority::values())
                ->mapWithKeys(fn (string $priority) => [$priority => (int) ($priorities[$priority] ?? 0)]),
            'categories' => $this->dashboard->categoryDistribution($membership->organization_id, $since),
            'oldest_active' => ConcernResource::collection(
                $scope()->active()
                    ->with(['category:id,name', 'creator:id,name,email', 'assignee:id,name,email'])
                    ->oldest()
                    ->limit(5)
                    ->get()
            ),
        ];
    }

    /** @return array<string, int> counts keyed by Y-m-d */
    private function perDay(Builder $query, string $column, Carbon $since): array
    {
        return $query->where($column, '>=', $since)
            ->toBase()
            ->selectRaw("DATE({$column}) as day, COUNT(*) as total")
            ->groupBy('day')
            ->pluck('total', 'day')
            ->all();
    }
}
