import { cx, initials } from '@/lib/format';

export function Avatar({ name, size = 'md', tone = 'light', className }) {
    return (
        <span
            aria-hidden="true"
            className={cx(
                'inline-flex shrink-0 select-none items-center justify-center rounded-full font-mono font-medium',
                size === 'sm' ? 'h-6 w-6 text-[0.625rem]' : 'h-8 w-8 text-2xs',
                tone === 'dark' ? 'bg-white/10 text-paper' : 'bg-ink-950/[0.07] text-ink-700',
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}

export function Person({ person, fallback = 'Unassigned', tone = 'light', className }) {
    if (!person) {
        return <span className={cx('text-[0.8125rem] italic', tone === 'dark' ? 'text-ink-400' : 'text-faint', className)}>{fallback}</span>;
    }

    return (
        <span className={cx('inline-flex min-w-0 items-center gap-2 text-[0.8125rem]', tone === 'dark' ? 'text-paper' : 'text-ink-800', className)}>
            <Avatar name={person.name} size="sm" tone={tone} />
            <span className="truncate">{person.name}</span>
        </span>
    );
}
