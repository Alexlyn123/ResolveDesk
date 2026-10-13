import { Link } from 'react-router-dom';
import { Hourglass, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/States';
import { ConcernList } from '@/features/concerns/ConcernList';
import { MetricLedger } from './MetricLedger';
import { StatusFeed, ViewAll } from './shared';

export function CustomerDashboard({ data }) {
    const { metrics } = data;

    if (metrics.total === 0) {
        return (
            <EmptyState
                icon={Plus}
                title="You have not submitted any concerns yet"
                action={
                    <Button to="/concerns/create" icon={Plus}>
                        Submit your first concern
                    </Button>
                }
                className="border-y border-line py-20"
            >
                Describe what you need help with. You will get a reference and can follow every update here.
            </EmptyState>
        );
    }

    return (
        <div className="space-y-12">
            {data.needs_response.length > 0 && (
                <section aria-labelledby="needs-response-title" className="border-l-2 border-amber-600 bg-amber-50 px-5 py-4">
                    <h2 id="needs-response-title" className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                        <Hourglass className="h-4 w-4" aria-hidden="true" />
                        Waiting for your reply
                    </h2>
                    <ul className="mt-2 divide-y divide-amber-100">
                        {data.needs_response.map((concern) => (
                            <li key={concern.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
                                <span className="min-w-0">
                                    <span className="ticket">{concern.reference}</span>
                                    <span className="mt-0.5 block truncate font-medium text-ink-950">{concern.title}</span>
                                </span>
                                <Button to={`/concerns/${concern.id}`} size="sm" variant="secondary">
                                    Read and reply
                                </Button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <MetricLedger
                lead={{ label: 'My concerns', value: metrics.total, caption: 'Everything you have submitted.', to: '/concerns' }}
                items={[
                    { label: 'Open', value: metrics.open, caption: 'Submitted or under review' },
                    { label: 'In progress', value: metrics.in_progress, caption: 'Being worked on, or waiting on you' },
                    { label: 'Resolved', value: metrics.resolved, caption: 'Resolved or closed', tone: 'positive' },
                ]}
            />

            <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <Section title="My recent submissions" action={<ViewAll to="/concerns" />}>
                    <ConcernList concerns={data.recent} showAssignee empty="No concerns yet." />
                </Section>

                <Section title="Latest updates" description="What the team has done on your concerns.">
                    <StatusFeed entries={data.updates} showNotes empty="No updates from the team yet. You will see them here as soon as there are any." />
                </Section>
            </div>

            <p className="text-sm text-muted">
                Something new to report?{' '}
                <Link to="/concerns/create" className="rounded font-medium text-ink-950 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-950">
                    Submit a concern
                </Link>
            </p>
        </div>
    );
}
