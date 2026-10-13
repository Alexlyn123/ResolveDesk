import { useSearchParams } from 'react-router-dom';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthContext';
import { ConcernList } from '@/features/concerns/ConcernList';
import { BarList, TrendChart } from '@/features/dashboard/charts';
import { PeriodSelect } from '@/features/dashboard/DashboardPage';
import { MetricLedger } from '@/features/dashboard/MetricLedger';
import { StatusPipeline, ViewAll } from '@/features/dashboard/shared';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { PRIORITIES } from '@/lib/constants';
import { cx, formatDay } from '@/lib/format';
import { dashboardApi } from '@/lib/services';

function formatDuration(hours) {
    if (hours === null || hours === undefined) return { value: '—', caption: 'No concerns were resolved in this period.' };
    if (hours < 48) return { value: `${Math.round(hours)}h`, caption: 'Average time from submission to resolution.' };

    return { value: `${(hours / 24).toFixed(1)}d`, caption: 'Average time from submission to resolution.' };
}

export function ReportsPage() {
    const { organization } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const period = ['7', '30', '90'].includes(searchParams.get('period')) ? searchParams.get('period') : '30';
    const { data, error, loading, refreshing, reload } = useQuery(() => dashboardApi.report(period), [period, organization.id]);

    useDocumentTitle('Reports');

    const duration = data ? formatDuration(data.totals.average_resolution_hours) : null;

    return (
        <>
            <PageHeader
                eyebrow={organization.name}
                title="Reports"
                description={data ? `Activity from ${formatDay(data.from)} to ${formatDay(data.to)}.` : 'How concerns are flowing through the workspace.'}
                actions={<PeriodSelect value={period} onChange={(value) => setSearchParams(value === '30' ? {} : { period: value }, { replace: true })} />}
            />

            {loading ? (
                <LoadingState label="Loading report" />
            ) : error && !data ? (
                <ErrorState error={error} onRetry={reload} title="The report could not be loaded" />
            ) : (
                <div className={cx('space-y-12 transition-opacity', refreshing && 'opacity-60')} aria-busy={refreshing}>
                    <MetricLedger
                        lead={{ label: 'Avg. time to resolve', value: duration.value, caption: duration.caption }}
                        items={[
                            { label: 'Submitted', value: data.totals.created, caption: `In the last ${data.period_days} days` },
                            { label: 'Resolved', value: data.totals.resolved, caption: `In the last ${data.period_days} days`, tone: 'positive' },
                            { label: 'Active now', value: data.totals.active_now, caption: 'Not yet resolved', to: '/concerns?status=active' },
                            { label: 'Overdue now', value: data.totals.overdue_now, caption: 'Past the target date', tone: 'alert', to: '/concerns?overdue=1' },
                        ]}
                    />

                    <Section title="Submitted and resolved per day" description="When resolved keeps pace with submitted, the backlog is not growing.">
                        <div className="pt-4">
                            <TrendChart series={data.series} />
                        </div>
                    </Section>

                    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-2">
                        <Section title="Concerns by status" description="All concerns on record, right now.">
                            <StatusPipeline counts={data.status_counts} />
                        </Section>

                        <Section title="Active concerns by priority" description="What the open workload is made of.">
                            <BarList
                                items={PRIORITIES.slice()
                                    .reverse()
                                    .map((priority) => ({
                                        key: priority.value,
                                        name: priority.label,
                                        label: <PriorityIndicator priority={priority.value} />,
                                        value: data.priorities[priority.value] ?? 0,
                                        to: `/concerns?status=active&priority=${priority.value}`,
                                    }))}
                            />
                        </Section>

                        <Section title="Submitted by category" description={`Concerns raised in the last ${data.period_days} days.`}>
                            <BarList
                                empty="No concerns were submitted in this period."
                                items={data.categories.map((category) => ({
                                    key: category.id,
                                    name: category.name,
                                    label: category.name,
                                    value: category.total,
                                    to: `/concerns?category_id=${category.id}`,
                                }))}
                            />
                        </Section>

                        <Section title="Longest-waiting active concerns" action={<ViewAll to="/concerns?status=active&sort=created_at:asc" />}>
                            <ConcernList concerns={data.oldest_active} showAssignee empty="There are no active concerns." />
                        </Section>
                    </div>
                </div>
            )}
        </>
    );
}
