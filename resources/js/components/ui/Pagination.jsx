import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/format';

function pageWindow(current, last) {
    const pages = new Set([1, last, current - 1, current, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);

    return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1] > 1 ? ['gap', page] : [page]));
}

/** @param {{ meta: {current_page: number, last_page: number, from: ?number, to: ?number, total: number}, onPageChange: (page: number) => void, disabled?: boolean, noun?: string }} props */
export function Pagination({ meta, onPageChange, disabled = false, noun = 'result' }) {
    if (!meta || meta.total === 0) return null;

    const { current_page: current, last_page: last, from, to, total } = meta;

    const buttonClass =
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-ink-300';

    return (
        <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted" aria-live="polite">
                Showing <span className="font-medium tabular-nums text-ink-900">{from}</span>–
                <span className="font-medium tabular-nums text-ink-900">{to}</span> of{' '}
                <span className="font-medium tabular-nums text-ink-900">{total}</span> {total === 1 ? noun : `${noun}s`}
            </p>

            {last > 1 && (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        className={cx(buttonClass, 'gap-1 pr-3 text-ink-700 hover:bg-ink-950/[0.06]')}
                        onClick={() => onPageChange(current - 1)}
                        disabled={disabled || current <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Previous
                    </button>

                    <ul className="hidden items-center gap-1 sm:flex">
                        {pageWindow(current, last).map((page, index) =>
                            page === 'gap' ? (
                                // eslint-disable-next-line react/no-array-index-key
                                <li key={`gap-${index}`} className="px-1 text-faint" aria-hidden="true">
                                    …
                                </li>
                            ) : (
                                <li key={page}>
                                    <button
                                        type="button"
                                        className={cx(
                                            buttonClass,
                                            page === current ? 'bg-ink-950 font-medium text-paper' : 'text-ink-700 hover:bg-ink-950/[0.06]',
                                        )}
                                        aria-label={`Page ${page}`}
                                        aria-current={page === current ? 'page' : undefined}
                                        onClick={() => page !== current && onPageChange(page)}
                                        disabled={disabled}
                                    >
                                        {page}
                                    </button>
                                </li>
                            ),
                        )}
                    </ul>

                    <span className="px-2 text-sm tabular-nums text-muted sm:hidden">
                        {current} / {last}
                    </span>

                    <button
                        type="button"
                        className={cx(buttonClass, 'gap-1 pl-3 text-ink-700 hover:bg-ink-950/[0.06]')}
                        onClick={() => onPageChange(current + 1)}
                        disabled={disabled || current >= last}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            )}
        </nav>
    );
}
