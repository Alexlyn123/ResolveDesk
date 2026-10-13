import { PRIORITIES, PRIORITY_LABELS } from '@/lib/constants';
import { cx } from '@/lib/format';

const COLORS = {
    low: { light: 'text-faint', dark: 'text-ink-400' },
    medium: { light: 'text-ink-600', dark: 'text-ink-300' },
    high: { light: 'text-amber-600', dark: 'text-amber-300' },
    urgent: { light: 'text-signal-600', dark: 'text-signal-300' },
};

export function PriorityIndicator({ priority, tone = 'light', showLabel = true, className }) {
    const rank = PRIORITIES.find((item) => item.value === priority)?.rank ?? 0;
    const label = PRIORITY_LABELS[priority] ?? priority;

    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem]',
                tone === 'dark' ? 'text-ink-300' : 'text-ink-700',
                priority === 'urgent' && 'font-medium',
                className,
            )}
        >
            <svg viewBox="0 0 14 12" className={cx('h-3 w-3.5 shrink-0', COLORS[priority]?.[tone])} aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                    <rect
                        key={index}
                        x={index * 3.5}
                        y={9 - index * 3}
                        width="2.5"
                        height={3 + index * 3}
                        rx="0.75"
                        fill="currentColor"
                        opacity={index < rank ? 1 : 0.22}
                    />
                ))}
            </svg>
            {showLabel ? label : <span className="sr-only">{label} priority</span>}
        </span>
    );
}
