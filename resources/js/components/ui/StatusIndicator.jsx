import { STATUS_LABELS } from '@/lib/constants';
import { cx } from '@/lib/format';

const TONES = {
    open: { light: 'text-ink-600', dark: 'text-ink-300' },
    under_review: { light: 'text-steel-600', dark: 'text-steel-300' },
    in_progress: { light: 'text-steel-600', dark: 'text-steel-300' },
    waiting_for_customer: { light: 'text-amber-600', dark: 'text-amber-300' },
    resolved: { light: 'text-jade-600', dark: 'text-jade-300' },
    closed: { light: 'text-faint', dark: 'text-ink-400' },
};

export function StatusGlyph({ status, className }) {
    const common = { cx: 8, cy: 8, r: 6.25, stroke: 'currentColor', strokeWidth: 1.5 };

    return (
        <svg viewBox="0 0 16 16" className={cx('h-4 w-4 shrink-0', className)} fill="none" aria-hidden="true">
            {status === 'open' && <circle {...common} />}
            {status === 'under_review' && (
                <>
                    <circle {...common} />
                    <circle cx="8" cy="8" r="2.25" fill="currentColor" />
                </>
            )}
            {status === 'in_progress' && (
                <>
                    <circle {...common} />
                    <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" fill="currentColor" />
                </>
            )}
            {status === 'waiting_for_customer' && (
                <>
                    <circle {...common} />
                    <path d="M6.4 5.6v4.8M9.6 5.6v4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
            )}
            {status === 'resolved' && (
                <>
                    <circle cx="8" cy="8" r="7" fill="currentColor" />
                    <path d="m5 8.2 2.1 2.1L11.2 6" stroke="var(--glyph-knockout, #fff)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {status === 'closed' && (
                <>
                    <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
                    <path d="M5.2 8h5.6" stroke="var(--glyph-knockout, #fff)" strokeWidth="1.6" strokeLinecap="round" />
                </>
            )}
        </svg>
    );
}

export function StatusIndicator({ status, tone = 'light', size = 'md', className }) {
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1.5 whitespace-nowrap font-medium',
                size === 'lg' ? 'text-[0.9375rem]' : 'text-[0.8125rem]',
                tone === 'dark' ? 'text-paper' : 'text-ink-900',
                className,
            )}
            style={tone === 'dark' ? { '--glyph-knockout': '#0B1322' } : undefined}
        >
            <StatusGlyph status={status} className={cx(TONES[status]?.[tone], size === 'lg' && 'h-[1.125rem] w-[1.125rem]')} />
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}
