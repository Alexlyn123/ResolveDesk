import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { StatusGlyph, StatusIndicator } from '@/components/ui/StatusIndicator';
import { STATUSES, STATUS_LABELS } from '@/lib/constants';
import { cx, formatDateTime, formatRelative } from '@/lib/format';
import { BarList } from './charts';

export function ViewAll({ to, children = 'View all' }) {
    return (
        <Link to={to} className="inline-flex items-center gap-1 whitespace-nowrap rounded text-[0.8125rem] font-medium text-ink-700 hover:text-ink-950">
            {children}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
    );
}

export function StatusPipeline({ counts }) {
    return (
        <BarList
            labelWidth="10.5rem"
            items={STATUSES.map((status) => ({
                key: status.value,
                name: status.label,
                label: <StatusIndicator status={status.value} />,
                value: counts[status.value] ?? 0,
                to: `/concerns?status=${status.value}`,
            }))}
        />
    );
}

const GLYPH_TONE = {
    open: 'text-ink-500',
    under_review: 'text-steel-600',
    in_progress: 'text-steel-600',
    waiting_for_customer: 'text-amber-600',
    resolved: 'text-jade-600',
    closed: 'text-faint',
};

export function StatusFeed({ entries, empty, showNotes = false }) {
    if (entries.length === 0) {
        return <p className="py-6 text-sm text-muted">{empty}</p>;
    }

    return (
        <ol className="divide-y divide-line">
            {entries.map((entry) => (
                <li key={entry.id}>
                    <Link to={`/concerns/${entry.concern.id}`} className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-ink-950/[0.035]">
                        <StatusGlyph status={entry.new_status} className={cx('mt-0.5', GLYPH_TONE[entry.new_status])} />
                        <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
                            <span className="block text-ink-800">
                                <span className="font-medium text-ink-950">{entry.changed_by?.name ?? 'Someone'}</span>{' '}
                                {entry.old_status ? (
                                    <>
                                        moved <span className="ticket">{entry.concern.reference}</span> to{' '}
                                        <span className="font-medium text-ink-950">{STATUS_LABELS[entry.new_status]}</span>
                                    </>
                                ) : (
                                    <>
                                        submitted <span className="ticket">{entry.concern.reference}</span>
                                    </>
                                )}
                            </span>
                            <span className="mt-0.5 block truncate text-muted group-hover:text-ink-800">{entry.concern.title}</span>
                            {showNotes && entry.note && entry.old_status && (
                                <span className="mt-1.5 line-clamp-3 block border-l-2 border-paper-300 pl-2.5 text-muted">{entry.note}</span>
                            )}
                        </span>
                        <time dateTime={entry.created_at} title={formatDateTime(entry.created_at)} className="shrink-0 whitespace-nowrap text-xs text-faint">
                            {formatRelative(entry.created_at)}
                        </time>
                    </Link>
                </li>
            ))}
        </ol>
    );
}
