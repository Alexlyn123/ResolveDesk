import { Section } from '@/components/ui/PageHeader';
import { ConcernList } from '@/features/concerns/ConcernList';
import { MetricLedger } from './MetricLedger';
import { StatusPipeline, ViewAll } from './shared';

export function StaffDashboard({ data }) {
    const { metrics, period_days: days } = data;

    return (
        <div className="space-y-12">
            <MetricLedger
                lead={{
                    label: 'Assigned to you',
                    value: metrics.assigned_to_me,
                    caption: 'Active concerns you are responsible for.',
                    to: '/concerns?assignee=me&status=active',
                }}
                items={[
                    { label: 'Open', value: metrics.open, caption: `Of ${metrics.total} in the organization`, to: '/concerns?status=open' },
                    { label: 'In progress', value: metrics.in_progress, caption: 'Being worked on', to: '/concerns?status=in_progress' },
                    { label: `Resolved · ${days}d`, value: metrics.resolved_in_period, caption: `In the last ${days} days`, tone: 'positive', to: '/reports' },
                    { label: 'Overdue', value: metrics.overdue, caption: 'Past the target date', tone: 'alert', to: '/concerns?overdue=1' },
                ]}
            />

            <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <div className="space-y-12">
                    <Section
                        title="Assigned to you"
                        description="Highest priority first."
                        action={metrics.assigned_to_me > 0 && <ViewAll to="/concerns?assignee=me&status=active" />}
                    >
                        <ConcernList concerns={data.assigned_to_me} showCreator empty="Nothing is assigned to you. Pick something up from the unassigned queue." />
                    </Section>

                    <Section
                        title="Unassigned queue"
                        description="Concerns nobody owns yet."
                        action={metrics.unassigned > 0 && <ViewAll to="/concerns?assignee=unassigned&status=active" />}
                    >
                        <ConcernList concerns={data.unassigned} showCreator empty="The queue is empty. Every active concern has an owner." />
                    </Section>

                    <Section title="Recently updated" action={<ViewAll to="/concerns?sort=updated_at:desc" />}>
                        <ConcernList concerns={data.recently_updated} showAssignee empty="No concerns yet." />
                    </Section>
                </div>

                <div className="space-y-12">
                    {data.overdue.length > 0 && (
                        <Section title="Overdue" description="Past their target date." action={<ViewAll to="/concerns?overdue=1" />}>
                            <ConcernList concerns={data.overdue} showAssignee empty="" />
                        </Section>
                    )}

                    <Section title="High priority" description="High and urgent concerns still active." action={<ViewAll to="/concerns?status=active&sort=priority:desc" />}>
                        <ConcernList concerns={data.high_priority} showAssignee empty="No high-priority concerns are active." />
                    </Section>

                    <Section title="Concerns by status" description="The whole organization, right now.">
                        <StatusPipeline counts={data.status_counts} />
                    </Section>
                </div>
            </div>
        </div>
    );
}
