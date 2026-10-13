import { ArrowRight } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

const STEPS = [
    {
        title: 'A customer submits a concern',
        body: 'They describe the issue, pick a category, and suggest a priority. It is saved with a reference they can quote later.',
        statuses: ['open'],
    },
    {
        title: 'The organization reviews and assigns it',
        body: 'Staff confirm what is needed, set the priority and a target date, and give the concern to one responsible person.',
        statuses: ['under_review'],
    },
    {
        title: 'Staff investigate and provide updates',
        body: 'Progress is posted where the customer can read it. Private notes stay with the team. If more detail is needed, the concern waits for the customer.',
        statuses: ['in_progress', 'waiting_for_customer'],
    },
    {
        title: 'The resolution is recorded and the concern is closed',
        body: 'Resolving requires a written outcome. Closing is a separate step, so the customer can confirm the fix first.',
        statuses: ['resolved', 'closed'],
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="on-dark bg-ink-950 py-24 text-paper lg:py-32">
            <div className="mx-auto max-w-site px-5 sm:px-8">
                <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-7">
                        <p className="eyebrow text-ink-400">How it works</p>
                        <h2 className="display mt-4 text-[2rem] leading-[1.08] text-paper sm:text-5xl">Four steps, each one on the record.</h2>
                    </div>
                    <p className="text-ink-300 lg:col-span-5">
                        The workflow is enforced by the system, not by habit. A concern can only move along the paths below, and every move
                        is saved with a name and a time.
                    </p>
                </div>

                <ol className="mt-16 grid gap-y-10 lg:grid-cols-4 lg:gap-x-8">
                    {STEPS.map((step, index) => (
                        <li key={step.title} className="relative border-l border-white/15 pb-2 pl-6 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pt-7">
                            <span
                                className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-jade-500 ring-4 ring-ink-950 lg:-top-[5px] lg:left-0"
                                aria-hidden="true"
                            />
                            <p className="font-mono text-xs text-ink-400">Step {index + 1}</p>
                            <h3 className="mt-3 text-lg font-medium leading-snug text-paper">{step.title}</h3>
                            <p className="mt-2.5 text-sm leading-relaxed text-ink-300">{step.body}</p>
                            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                {step.statuses.map((status, statusIndex) => (
                                    <span key={status} className="flex items-center gap-2">
                                        {statusIndex > 0 && <ArrowRight className="h-3 w-3 text-ink-500" aria-hidden="true" />}
                                        <StatusIndicator status={status} tone="dark" />
                                    </span>
                                ))}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
