import { Link } from 'react-router-dom';
import { Person } from '@/components/ui/Avatar';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { cx, formatDay, formatRelative } from '@/lib/format';

export function OverdueFlag({ concern, className }) {
    if (!concern.is_overdue) return null;

    return (
        <span className={cx('whitespace-nowrap text-xs font-medium text-signal-700', className)}>
            Overdue · due {formatDay(concern.due_on, { short: true })}
        </span>
    );
}

export function ConcernList({ concerns, showAssignee = false, showCreator = false, empty }) {
    if (concerns.length === 0) {
        return <p className="py-6 text-sm text-muted">{empty}</p>;
    }

    return (
        <ul className="divide-y divide-line">
            {concerns.map((concern) => (
                <li key={concern.id}>
                    <Link
                        to={`/concerns/${concern.id}`}
                        className="group -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-md px-2 py-3 transition-colors hover:bg-ink-950/[0.035]"
                    >
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                                <span className="ticket">{concern.reference}</span>
                                <OverdueFlag concern={concern} />
                            </span>
                            <span className="mt-0.5 block truncate text-[0.9375rem] font-medium text-ink-950 group-hover:underline group-hover:decoration-ink-300 group-hover:underline-offset-4">
                                {concern.title}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
                                {concern.category && <span>{concern.category.name}</span>}
                                {showCreator && concern.creator && <span>from {concern.creator.name}</span>}
                                {showAssignee && <Person person={concern.assignee} />}
                                <span className="text-faint">Updated {formatRelative(concern.updated_at)}</span>
                            </span>
                        </span>
                        <span className="flex flex-col items-end gap-1.5">
                            <StatusIndicator status={concern.status} />
                            <PriorityIndicator priority={concern.priority} />
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
