import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '@/lib/format';
import { Spinner } from './Spinner';

const VARIANTS = {
    // The default action on a page.
    primary: 'bg-ink-950 text-paper hover:bg-ink-800 active:bg-ink-900 disabled:bg-ink-400',
    // Reserved for positive, resolving actions.
    accent: 'bg-jade-700 text-white hover:bg-jade-800 disabled:bg-jade-300',
    secondary:
        'border border-paper-300 bg-white text-ink-900 hover:border-ink-300 hover:bg-paper-100 disabled:text-ink-300 disabled:hover:bg-white',
    ghost: 'text-ink-700 hover:bg-ink-950/[0.06] disabled:text-ink-300 disabled:hover:bg-transparent',
    danger: 'bg-signal-600 text-white hover:bg-signal-700 disabled:bg-signal-300',
    // For use on navy surfaces.
    inverse: 'bg-paper text-ink-950 hover:bg-white disabled:bg-ink-400',
    'inverse-ghost': 'text-paper hover:bg-white/10',
};

const SIZES = {
    sm: 'h-8 gap-1.5 px-2.5 text-[0.8125rem]',
    md: 'h-10 gap-2 px-4 text-sm',
    lg: 'h-12 gap-2.5 px-5 text-[0.9375rem]',
};

export const Button = forwardRef(function Button(
    { variant = 'primary', size = 'md', loading = false, disabled = false, icon: Icon, to, className, children, type, ...props },
    ref,
) {
    const classes = cx(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
    );

    const content = (
        <>
            {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            {children}
        </>
    );

    if (to) {
        return (
            <Link ref={ref} to={to} className={classes} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button
            ref={ref}
            type={type ?? 'button'}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {content}
        </button>
    );
});

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, className, tone = 'light', ...props }, ref) {
    return (
        <button
            ref={ref}
            type="button"
            aria-label={label}
            title={label}
            className={cx(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                tone === 'dark' ? 'text-ink-300 hover:bg-white/10 hover:text-paper' : 'text-ink-600 hover:bg-ink-950/[0.06] hover:text-ink-950',
                className,
            )}
            {...props}
        >
            <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </button>
    );
});
