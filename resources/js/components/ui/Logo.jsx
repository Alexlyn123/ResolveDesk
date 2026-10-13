import { cx } from '@/lib/format';

export function BrandMark({ className }) {
    return (
        <svg viewBox="0 0 28 28" className={cx('h-7 w-7', className)} fill="none" aria-hidden="true">
            <path d="M23.2 9.2A10.5 10.5 0 1 0 24.5 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="m9.6 14.3 3.4 3.4 10.4-10.9" stroke="#12A08A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function Logo({ tone = 'light', className }) {
    return (
        <span className={cx('inline-flex items-center gap-2.5', tone === 'dark' ? 'text-paper' : 'text-ink-950', className)}>
            <BrandMark />
            <span className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
                Resolve<span className={tone === 'dark' ? 'text-ink-300' : 'text-ink-500'}>Desk</span>
            </span>
        </span>
    );
}
