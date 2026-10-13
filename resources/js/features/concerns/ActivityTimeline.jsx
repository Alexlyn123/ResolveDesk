import { ArrowRight, CalendarClock, Pencil, Tag, UserMinus, UserPlus } from 'lucide-react';
import { StatusGlyph } from '@/components/ui/StatusIndicator';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants';
import { cx, formatDateTime, formatDay, formatRelative } from '@/lib/format';

const GLYPH_TONE = {
    open: 'text-ink-500',
    under_review: 'text-steel-600',
    in_progress: 'text-steel-600',
    waiting_for_customer: 'text-amber-600',
    resolved: 'text-jade-600',
    closed: 'text-faint',
};

const ACTIVITY_ICONS = {
    assigned: UserPlus,
    unassigned: UserMinus,
    priority_changed: ArrowRight,
    category_changed: Tag,
    due_date_changed: CalendarClock,
    details_updated: Pencil,
};

function describeActivity({ type, properties }) {
    switch (type) {
        case 'assigned':
            return properties.from ? `reassigned this from ${properties.from} to ${properties.to}` : `assigned this to ${properties.to}`;
        case 'unassigned':
            return `removed ${properties.from ?? 'the assignee'} as the owner`;
        case 'priority_changed':
            return `changed the priority from ${PRIORITY_LABELS[properties.from] ?? properties.from} to ${PRIORITY_LABELS[properties.to] ?? properties.to}`;
        case 'category_changed':
            return `moved this from ${properties.from} to ${properties.to}`;
        case 'due_date_changed':
            return properties.to ? `set the target date to ${formatDay(properties.to)}` : 'removed the target date';
        case 'details_updated':
            return `edited the ${(properties.fields ?? ['details']).join(' and ')}`;
        default:
            return null;
    }
}

export function buildTimeline(concern) {
    const statusEntries = (concern.status_history ?? []).map((entry) => ({
        key: `status-${entry.id}`,
        kind: 'status',
        at: entry.created_at,
        actor: entry.changed_by?.name ?? 'Someone',
        status: entry.new_status,
        text: entry.old_status ? `changed the status to ${STATUS_LABELS[entry.new_status]}` : 'submitted this concern',
        // The first entry's note is boilerplate; the rest were written by a person.
        note: entry.old_status ? entry.note : null,
    }));

    const activityEntries = (concern.activities ?? [])
        .map((activity) => ({
            key: `activity-${activity.id}`,
            kind: activity.type,
            at: activity.created_at,
            actor: activity.actor?.name ?? 'Someone',
            text: describeActivity(activity),
        }))
        .filter((entry) => entry.text);

    return [...statusEntries, ...activityEntries].sort((a, b) => new Date(a.at) - new Date(b.at));
}

export function ActivityTimeline({ concern }) {
    const entries = buildTimeline(concern);

    return (
        <ol aria-label="Concern history">
            {entries.map((entry, index) => {
                const Icon = ACTIVITY_ICONS[entry.kind];

                return (
                    <li key={entry.key} className="relative flex gap-3 pb-5 last:pb-0">
                        {index < entries.length - 1 && <span className="absolute left-[0.4375rem] top-5 h-[calc(100%-1.25rem)] w-px bg-line" aria-hidden="true" />}
                        {entry.kind === 'status' ? (
                            <StatusGlyph status={entry.status} className={cx('relative mt-0.5', GLYPH_TONE[entry.status])} />
                        ) : (
                            <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-paper text-faint">
                                {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                            </span>
                        )}
                        <div className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
                            <p className="text-ink-800">
                                <span className="font-medium text-ink-950">{entry.actor}</span> {entry.text}
                            </p>
                            {entry.note && <p className="mt-1 whitespace-pre-line border-l-2 border-paper-300 pl-2.5 text-muted">{entry.note}</p>}
                            <time dateTime={entry.at} title={formatDateTime(entry.at)} className="mt-1 block text-xs text-faint">
                                {formatRelative(entry.at)}
                            </time>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
