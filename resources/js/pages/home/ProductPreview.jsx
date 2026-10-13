import { useState } from 'react';
import { Person } from '@/components/ui/Avatar';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { StatusGlyph, StatusIndicator } from '@/components/ui/StatusIndicator';
import { STATUS_LABELS } from '@/lib/constants';
import { cx } from '@/lib/format';
import { SAMPLE_CONCERNS } from './sampleData';

const GLYPH_TONE = {
    open: 'text-ink-300',
    under_review: 'text-steel-300',
    in_progress: 'text-steel-300',
    waiting_for_customer: 'text-amber-300',
    resolved: 'text-jade-300',
    closed: 'text-ink-400',
};

export function ResolutionTrail({ trail, next, className }) {
    return (
        <ol className={cx('relative', className)} style={{ '--glyph-knockout': '#0B1322' }}>
            {trail.map((step, index) => (
                <li key={step.status} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {(index < trail.length - 1 || next) && (
                        <span className="absolute left-[0.4375rem] top-5 h-[calc(100%-1.25rem)] w-px bg-white/15" aria-hidden="true" />
                    )}
                    <StatusGlyph status={step.status} className={cx('relative mt-0.5', GLYPH_TONE[step.status])} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="text-sm font-medium text-paper">{STATUS_LABELS[step.status]}</p>
                            <p className="font-mono text-2xs text-ink-400">{step.when}</p>
                        </div>
                        <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-300">{step.note}</p>
                    </div>
                </li>
            ))}
            {next && (
                <li className="relative flex gap-3.5 pt-0">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-dashed border-ink-500" aria-hidden="true" />
                    <p className="text-[0.8125rem] text-ink-500">
                        Next: <span className="text-ink-400">{STATUS_LABELS[next]}</span>
                    </p>
                </li>
            )}
        </ol>
    );
}

export function ProductPreview() {
    const [selectedId, setSelectedId] = useState(SAMPLE_CONCERNS[0].id);
    const selected = SAMPLE_CONCERNS.find((concern) => concern.id === selectedId);

    return (
        <figure className="on-dark overflow-hidden rounded-xl bg-ink-950 text-paper shadow-2xl shadow-ink-950/25 ring-1 ring-ink-950">
            <figcaption className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
                <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-400">Product preview</span>
                <span className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">Sample data</span>
            </figcaption>

            <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
                <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
                    <div className="flex items-baseline justify-between px-5 pb-2 pt-4">
                        <h3 className="text-sm font-medium text-paper">Concern queue</h3>
                        <p className="text-xs text-ink-400">Select one to follow it</p>
                    </div>
                    <ul>
                        {SAMPLE_CONCERNS.map((concern) => {
                            const active = concern.id === selectedId;

                            return (
                                <li key={concern.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(concern.id)}
                                        aria-pressed={active}
                                        className={cx(
                                            'relative grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-t border-white/[0.07] px-5 py-3.5 text-left transition-colors focus-visible:ring-inset',
                                            active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.035]',
                                        )}
                                    >
                                        {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-jade-500" aria-hidden="true" />}
                                        <span className="min-w-0">
                                            <span className="block font-mono text-2xs text-ink-400">{concern.id}</span>
                                            <span className="mt-0.5 block truncate text-sm text-paper">{concern.title}</span>
                                        </span>
                                        <span className="flex flex-col items-end gap-1">
                                            <StatusIndicator status={concern.status} tone="dark" />
                                            <PriorityIndicator priority={concern.priority} tone="dark" />
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div key={selected.id} className="animate-fade-in px-5 py-5 sm:px-6">
                    <p className="font-mono text-2xs text-ink-400">{selected.id}</p>
                    <h3 className="mt-1 font-display text-xl leading-snug text-paper">{selected.title}</h3>

                    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-white/10 py-3.5 text-[0.8125rem]">
                        <div>
                            <dt className="text-ink-500">Category</dt>
                            <dd className="mt-0.5 text-ink-300">{selected.category}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-500">Assigned to</dt>
                            <dd className="mt-0.5">
                                <Person person={selected.assignee} tone="dark" />
                            </dd>
                        </div>
                    </dl>

                    <p className="mb-3 mt-5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">Resolution trail</p>
                    <ResolutionTrail trail={selected.trail} next={selected.next} />
                </div>
            </div>
        </figure>
    );
}
