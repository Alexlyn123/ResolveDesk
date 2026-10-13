import { CloudOff, RotateCw, ShieldAlert } from 'lucide-react';
import { cx } from '@/lib/format';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label = 'Loading', className }) {
    return (
        <div role="status" className={cx('flex items-center justify-center gap-3 py-16 text-sm text-muted', className)}>
            <Spinner className="h-5 w-5 text-ink-400" />
            <span>{label}…</span>
        </div>
    );
}

export function SkeletonRows({ rows = 6, className }) {
    return (
        <div role="status" aria-label="Loading" className={cx('divide-y divide-line', className)}>
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center gap-4 py-4">
                    <div className="h-3 w-24 animate-pulse rounded bg-paper-200" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-paper-200" style={{ maxWidth: `${55 - (index % 3) * 12}%` }} />
                    <div className="hidden h-3 w-20 animate-pulse rounded bg-paper-200 sm:block" />
                </div>
            ))}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
    return (
        <div className={cx('flex flex-col items-center px-4 py-14 text-center', className)}>
            {Icon && (
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper-100 text-ink-500">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
            )}
            <h3 className="text-base font-semibold text-ink-950">{title}</h3>
            {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
            {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
        </div>
    );
}

export function ErrorState({ error, onRetry, title, className }) {
    const forbidden = error?.status === 403;
    const Icon = forbidden ? ShieldAlert : CloudOff;

    return (
        <div role="alert" className={cx('flex flex-col items-center px-4 py-14 text-center', className)}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-signal-100 bg-signal-50 text-signal-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-ink-950">
                {title ?? (forbidden ? 'You do not have access to this' : error?.status === 404 ? 'Not found' : 'This could not be loaded')}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted">{error?.message ?? 'Please try again.'}</p>
            {onRetry && !forbidden && error?.status !== 404 && (
                <Button variant="secondary" icon={RotateCw} onClick={onRetry} className="mt-5">
                    Try again
                </Button>
            )}
        </div>
    );
}

export function FormError({ children, className }) {
    if (!children) return null;

    return (
        <div role="alert" className={cx('rounded-md border border-signal-100 bg-signal-50 px-3.5 py-2.5 text-sm text-signal-700', className)}>
            {children}
        </div>
    );
}
