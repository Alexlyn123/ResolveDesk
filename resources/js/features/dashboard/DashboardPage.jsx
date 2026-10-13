import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { cx, pluralize } from '@/lib/format';
import { dashboardApi } from '@/lib/services';
import { AdminDashboard } from './AdminDashboard';
import { CustomerDashboard } from './CustomerDashboard';
import { StaffDashboard } from './StaffDashboard';

const PERIODS = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
];

export function PeriodSelect({ value, onChange }) {
    return (
        <Select aria-label="Reporting period" value={value} onChange={(event) => onChange(event.target.value)} className="w-40">
            {PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                    {period.label}
                </option>
            ))}
        </Select>
    );
}

function summarize(data, firstName) {
    const { metrics, role } = data;

    if (role === 'customer') {
        if (metrics.total === 0) return `Welcome, ${firstName}. When you submit a concern, you can follow it here.`;
        if (metrics.awaiting_response > 0) {
            return `${pluralize(metrics.awaiting_response, 'concern is', 'concerns are')} waiting for your reply.`;
        }
        const moving = metrics.open + metrics.in_progress;

        return moving > 0
            ? `${pluralize(moving, 'concern is', 'concerns are')} with the team. Nothing is needed from you right now.`
            : 'All of your concerns have been resolved.';
    }

    const parts = [];
    if (role === 'staff') parts.push(`You own ${pluralize(metrics.assigned_to_me, 'active concern')}`);
    if (metrics.unassigned > 0) parts.push(`${metrics.unassigned} ${role === 'staff' ? 'more are' : metrics.unassigned === 1 ? 'concern is' : 'concerns are'} unassigned`);
    if (metrics.overdue > 0) parts.push(`${metrics.overdue} ${metrics.overdue === 1 ? 'is' : 'are'} past the target date`);

    if (parts.length === 0) return 'Every active concern has an owner and none are overdue.';

    return `${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}.`;
}

export function DashboardPage() {
    const { user, organization, role } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const period = PERIODS.some((item) => item.value === searchParams.get('period')) ? searchParams.get('period') : '30';
    const { data, error, loading, refreshing, reload } = useQuery(() => dashboardApi.get(period), [period, organization.id, role]);

    useDocumentTitle('Overview');

    const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    const isCustomer = role === 'customer';

    return (
        <>
            <PageHeader
                eyebrow={`${today} · ${organization.name}`}
                title="Overview"
                description={data ? summarize(data, user.name.split(' ')[0]) : undefined}
                actions={
                    isCustomer ? (
                        <Button to="/concerns/create" size="lg" icon={Plus}>
                            Submit a concern
                        </Button>
                    ) : (
                        <PeriodSelect value={period} onChange={(value) => setSearchParams(value === '30' ? {} : { period: value }, { replace: true })} />
                    )
                }
            />

            {loading ? (
                <LoadingState label="Loading overview" />
            ) : error && !data ? (
                <ErrorState error={error} onRetry={reload} title="The overview could not be loaded" />
            ) : (
                <div className={cx('transition-opacity', refreshing && 'opacity-60')} aria-busy={refreshing}>
                    {data.role === 'admin' && <AdminDashboard data={data} />}
                    {data.role === 'staff' && <StaffDashboard data={data} />}
                    {data.role === 'customer' && <CustomerDashboard data={data} />}
                </div>
            )}
        </>
    );
}
