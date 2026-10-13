import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Person } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { StatusGlyph, StatusIndicator } from '@/components/ui/StatusIndicator';
import { STATUS_LABELS } from '@/lib/constants';
import { cx } from '@/lib/format';
import { WORKFLOW_STAGES } from './sampleData';

const GLYPH_TONE = {
    open: 'text-ink-500',
    under_review: 'text-steel-600',
    in_progress: 'text-steel-600',
    resolved: 'text-jade-600',
};

export function WorkflowPreview() {
    const [index, setIndex] = useState(0);
    const stage = WORKFLOW_STAGES[index];
    const isLast = index === WORKFLOW_STAGES.length - 1;

    return (
        <section className="py-24 lg:py-32" aria-labelledby="workflow-preview-title">
            <div className="mx-auto grid max-w-site gap-x-16 gap-y-12 px-5 sm:px-8 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <p className="eyebrow">Workflow preview</p>
                    <h2 id="workflow-preview-title" className="display mt-4 text-[2rem] leading-[1.08] sm:text-[2.5rem]">
                        Follow one concern from open to resolved.
                    </h2>
                    <p className="mt-5 text-muted">
                        Step through a leak reported by a resident. Watch who owns it, what the customer is told, and what the final record
                        says.
                    </p>

                    <ol className="mt-8">
                        {WORKFLOW_STAGES.map((item, itemIndex) => {
                            const active = itemIndex === index;

                            return (
                                <li key={item.key}>
                                    <button
                                        type="button"
                                        onClick={() => setIndex(itemIndex)}
                                        aria-pressed={active}
                                        className={cx(
                                            'flex w-full gap-4 border-l-2 py-3.5 pl-5 pr-2 text-left transition-colors',
                                            active ? 'border-ink-950' : 'border-line hover:border-ink-300',
                                        )}
                                    >
                                        <span className={cx('mt-0.5 font-mono text-xs', active ? 'text-ink-950' : 'text-faint')}>0{itemIndex + 1}</span>
                                        <span>
                                            <span className={cx('block text-base font-medium', active ? 'text-ink-950' : 'text-muted')}>{item.label}</span>
                                            <span className={cx('mt-0.5 block text-sm', active ? 'text-muted' : 'text-faint')}>{item.caption}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="mt-6 pl-5">
                        {isLast ? (
                            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setIndex(0)}>
                                Start again
                            </Button>
                        ) : (
                            <Button variant="secondary" size="sm" onClick={() => setIndex(index + 1)}>
                                Next: {WORKFLOW_STAGES[index + 1].label}
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-7">
                    <article className="overflow-hidden rounded-lg border border-paper-300 bg-white shadow-[0_1px_0_rgba(16,27,48,0.04),0_18px_40px_-24px_rgba(16,27,48,0.25)]" aria-live="polite">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
                            <span className="ticket">RD-2026-000184</span>
                            <StatusIndicator key={stage.status} status={stage.status} size="lg" className="animate-fade-in" />
                        </header>

                        <div className="px-5 py-5 sm:px-6">
                            <h3 className="display text-2xl leading-snug">Water leaking under the kitchen sink</h3>
                            <p className="mt-2 text-sm text-muted">
                                There is a steady drip from the pipe joint under my kitchen sink. I have put a bucket underneath, but it fills up
                                every few hours.
                            </p>

                            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4 text-[0.8125rem] sm:grid-cols-3">
                                <div>
                                    <dt className="text-faint">Assigned to</dt>
                                    <dd key={stage.assignee?.name ?? 'none'} className="mt-1 animate-fade-in">
                                        <Person person={stage.assignee} />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-faint">Priority</dt>
                                    <dd className="mt-1">
                                        <PriorityIndicator priority="high" />
                                    </dd>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <dt className="text-faint">Last updated</dt>
                                    <dd className="mt-1 text-ink-800">{stage.updated}</dd>
                                </div>
                            </dl>

                            <h4 className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-faint">History</h4>
                            <ol>
                                {stage.timeline.map((entry, entryIndex) => (
                                    <li key={entry.status} className="relative flex gap-3 pb-4 last:pb-0">
                                        {entryIndex < stage.timeline.length - 1 && (
                                            <span className="absolute left-[0.4375rem] top-5 h-[calc(100%-1.25rem)] w-px bg-line" aria-hidden="true" />
                                        )}
                                        <StatusGlyph status={entry.status} className={cx('relative mt-0.5', GLYPH_TONE[entry.status])} />
                                        <div className="min-w-0 flex-1 text-sm">
                                            <p className="text-ink-900">
                                                <span className="font-medium">{STATUS_LABELS[entry.status]}</span>
                                                <span className="text-muted"> · {entry.actor}</span>
                                            </p>
                                            <p className="text-muted">{entry.text}</p>
                                        </div>
                                        <span className="font-mono text-2xs text-faint">{entry.when}</span>
                                    </li>
                                ))}
                            </ol>

                            {stage.resolution && (
                                <div className="mt-5 animate-rise-in border-l-2 border-jade-600 bg-jade-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-jade-800">Resolution</p>
                                    <p className="mt-1 text-sm text-ink-900">{stage.resolution}</p>
                                </div>
                            )}
                        </div>
                    </article>
                    <p className="mt-3 text-xs text-faint">Illustrative example using sample data.</p>
                </div>
            </div>
        </section>
    );
}
