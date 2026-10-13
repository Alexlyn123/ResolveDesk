import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cx } from '@/lib/format';

function Figure({ item, large = false }) {
    const Wrapper = item.to ? Link : 'div';

    return (
        <Wrapper
            {...(item.to ? { to: item.to } : {})}
            className={cx('group block h-full bg-paper px-4 py-5 transition-colors sm:px-5', item.to && 'hover:bg-paper-100 focus-visible:ring-inset')}
        >
            <dt className="flex items-center justify-between gap-2 font-mono text-2xs uppercase tracking-[0.12em] text-faint">
                {item.label}
                {item.to && (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                )}
            </dt>
            <dd
                className={cx(
                    'mt-3 font-display tabular-nums leading-none tracking-[-0.02em]',
                    large ? 'text-6xl sm:text-7xl' : 'text-[2.5rem]',
                    item.tone === 'alert' && item.value > 0 ? 'text-signal-700' : item.tone === 'positive' ? 'text-jade-700' : 'text-ink-950',
                )}
            >
                {item.value}
            </dd>
            {item.caption && <dd className="mt-2 text-[0.8125rem] leading-snug text-muted">{item.caption}</dd>}
        </Wrapper>
    );
}

/** @param {{ lead: {label: string, value: number, caption?: string, to?: string}, items: Array<{label: string, value: number, caption?: string, to?: string, tone?: 'alert'|'positive'}> }} props */
export function MetricLedger({ lead, items }) {
    return (
        // Hairlines are the grid gaps showing the rule colour underneath.
        <dl className="grid gap-px border-y border-ink-950 bg-line lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
            <Figure item={lead} large />
            <div className={cx('grid gap-px bg-line', items.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
                {items.map((item) => (
                    <Figure key={item.label} item={item} />
                ))}
            </div>
        </dl>
    );
}
