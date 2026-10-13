import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Section } from '@/components/ui/PageHeader';
import { ConcernList } from '@/features/concerns/ConcernList';
import { ROLE_LABELS } from '@/lib/constants';
import { cx, pluralize } from '@/lib/format';
import { BarList } from './charts';
import { MetricLedger } from './MetricLedger';
import { StatusFeed, StatusPipeline, ViewAll } from './shared';

function Workload({ members, periodDays }) {
    const max = Math.max(1, ...members.map((member) => member.active));

    if (members.length === 0) {
        return <p className="py-6 text-sm text-muted">No staff members yet. Add your team to start assigning concerns.</p>;
    }

    return (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[30rem] text-left">
                <thead>
                    <tr className="border-b border-line font-mono text-2xs uppercase tracking-[0.1em] text-faint">
                        <th scope="col" className="py-2.5 font-medium">
                            Team member
                        </th>
                        <th scope="col" className="w-[38%] px-3 py-2.5 font-medium">
                            Active concerns
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">
                            Overdue
                        </th>
                        <th scope="col" className="py-2.5 text-right font-medium">
                            Resolved · {periodDays}d
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {members.map((member) => (
                        <tr key={member.user.id}>
                            <th scope="row" className="py-3 font-normal">
                                <span className="flex items-center gap-2.5">
                                    <Avatar name={member.user.name} size="sm" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-ink-950">{member.user.name}</span>
                                        <span className="block text-xs text-faint">{ROLE_LABELS[member.role]}</span>
                                    </span>
                                </span>
                            </th>
                            <td className="px-3 py-3">
                                <Link
                                    to={`/concerns?assignee=${member.user.id}&status=active`}
                                    title={`${member.user.name}: ${pluralize(member.active, 'active concern')}`}
                                    className="group flex items-center gap-2 rounded"
                                >
                                    <span
                                        className="h-2 rounded-r-[4px] bg-ink-700 group-hover:bg-ink-950"
                                        style={{ width: member.active === 0 ? 0 : `max(3px, ${(member.active / max) * 80}%)` }}
                                        aria-hidden="true"
                                    />
                                    <span className="font-mono text-xs tabular-nums text-ink-900">{member.active}</span>
                                </Link>
                            </td>
                            <td className={cx('px-3 py-3 text-right font-mono text-xs tabular-nums', member.overdue > 0 ? 'font-medium text-signal-700' : 'text-faint')}>
                                {member.overdue}
                            </td>
                            <td className="py-3 text-right font-mono text-xs tabular-nums text-ink-900">{member.resolved_in_period}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AdminDashboard({ data }) {
    const { metrics, period_days: days, team } = data;
    const teamSize = (team.staff ?? 0) + (team.admin ?? 0);

    return (
        <div className="space-y-12">
            <MetricLedger
                lead={{
                    label: 'Total concerns',
                    value: metrics.total,
                    caption: `On record in this workspace, raised by ${pluralize(team.customer ?? 0, 'customer')}.`,
                    to: '/concerns',
                }}
                items={[
                    { label: 'Open', value: metrics.open, caption: 'Not yet picked up', to: '/concerns?status=open' },
                    { label: 'In progress', value: metrics.in_progress, caption: 'Being worked on', to: '/concerns?status=in_progress' },
                    { label: `Resolved · ${days}d`, value: metrics.resolved_in_period, caption: `In the last ${days} days`, tone: 'positive', to: '/reports' },
                    { label: 'Overdue', value: metrics.overdue, caption: 'Past the target date', tone: 'alert', to: '/concerns?overdue=1' },
                ]}
            />

            <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <div className="space-y-12">
                    <Section
                        title="Unassigned concerns"
                        description={metrics.unassigned > 0 ? `${pluralize(metrics.unassigned, 'concern has', 'concerns have')} no owner yet.` : 'Every active concern has an owner.'}
                        action={metrics.unassigned > 0 && <ViewAll to="/concerns?assignee=unassigned&status=active" />}
                    >
                        <ConcernList concerns={data.unassigned} showCreator empty="Nothing is waiting to be assigned." />
                    </Section>

                    {data.overdue.length > 0 && (
                        <Section title="Overdue" description="Active concerns past their target date." action={<ViewAll to="/concerns?overdue=1" />}>
                            <ConcernList concerns={data.overdue} showAssignee empty="" />
                        </Section>
                    )}

                    <Section
                        title="Workload"
                        description={`${pluralize(teamSize, 'team member')} handling concerns.`}
                        action={<ViewAll to="/team">Manage team</ViewAll>}
                    >
                        <Workload members={data.workload} periodDays={days} />
                    </Section>
                </div>

                <div className="space-y-12">
                    <Section title="Concerns by status" description="Where everything stands right now.">
                        <StatusPipeline counts={data.status_counts} />
                    </Section>

                    <Section title="Concerns by category" description="All concerns on record." action={<ViewAll to="/categories">Manage</ViewAll>}>
                        <BarList
                            empty="No concerns have been categorised yet."
                            items={data.categories.map((category) => ({
                                key: category.id,
                                name: category.name,
                                label: category.name,
                                value: category.total,
                                secondary: category.active > 0 ? `${category.active} active` : undefined,
                                to: `/concerns?category_id=${category.id}`,
                            }))}
                        />
                    </Section>

                    <Section title="Recent activity" description="Latest status changes across the workspace.">
                        <StatusFeed entries={data.recent_activity} empty="No activity yet." />
                    </Section>
                </div>
            </div>
        </div>
    );
}
