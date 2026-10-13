import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cx } from '@/lib/format';

export function PageHeader({ eyebrow, title, description, actions, back, className }) {
    return (
        <header className={cx('mb-8', className)}>
            {back && (
                <Link
                    to={back.to}
                    className="-ml-1 mb-4 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm text-muted transition-colors hover:text-ink-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {back.label}
                </Link>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                    <h1 className="display text-[2rem] leading-[1.1] sm:text-[2.5rem]">{title}</h1>
                    {description && <p className="mt-2 max-w-2xl text-[0.9375rem] text-muted">{description}</p>}
                </div>
                {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </header>
    );
}

export function Section({ title, description, action, children, className }) {
    return (
        <section className={className}>
            <div className="mb-3 flex items-end justify-between gap-4 border-b border-ink-950 pb-2.5">
                <div>
                    <h2 className="text-[0.9375rem] font-semibold text-ink-950">{title}</h2>
                    {description && <p className="mt-0.5 text-[0.8125rem] text-muted">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}
