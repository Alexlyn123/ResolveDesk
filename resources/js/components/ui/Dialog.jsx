import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert, X } from 'lucide-react';
import { cx } from '@/lib/format';
import { Button, IconButton } from './Button';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }) {
    const panelRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const dismissibleRef = useRef(dismissible);
    dismissibleRef.current = dismissible;

    useEffect(() => {
        if (!open) return undefined;

        const previouslyFocused = document.activeElement;
        const panel = panelRef.current;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        // Prefer the first form control; fall back to the panel itself.
        const first = panel.querySelector('[data-autofocus]') ?? panel.querySelector('textarea, input, select') ?? panel;
        first.focus({ preventScroll: true });

        function onKeyDown(event) {
            if (event.key === 'Escape' && dismissibleRef.current) {
                event.stopPropagation();
                onCloseRef.current();

                return;
            }

            if (event.key !== 'Tab') return;

            const items = [...panel.querySelectorAll(FOCUSABLE)].filter((element) => element.offsetParent !== null || element === document.activeElement);
            if (items.length === 0) {
                event.preventDefault();

                return;
            }

            const firstItem = items[0];
            const lastItem = items[items.length - 1];

            if (event.shiftKey && (document.activeElement === firstItem || document.activeElement === panel)) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                firstItem.focus();
            }
        }

        document.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            document.body.style.overflow = overflow;
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <div
                className="absolute inset-0 animate-fade-in bg-ink-950/55"
                onClick={() => dismissible && onClose()}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                className={cx(
                    'relative flex max-h-[92vh] w-full animate-rise-in flex-col rounded-t-xl bg-paper shadow-2xl shadow-ink-950/30 outline-none sm:rounded-lg',
                    size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-lg',
                )}
            >
                <header className="flex items-start justify-between gap-4 px-5 pb-1 pt-5 sm:px-6">
                    <div>
                        <h2 id={titleId} className="text-lg font-semibold leading-snug text-ink-950">
                            {title}
                        </h2>
                        {description && (
                            <p id={descriptionId} className="mt-1 text-sm text-muted">
                                {description}
                            </p>
                        )}
                    </div>
                    {dismissible && <IconButton icon={X} label="Close dialog" onClick={onClose} className="-mr-2 -mt-1.5" />}
                </header>

                {children && <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>}

                {footer && (
                    <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                        {footer}
                    </footer>
                )}
            </div>
        </div>,
        document.body,
    );
}

export function ConfirmDialog({
    open,
    onCancel,
    onConfirm,
    title,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    loading = false,
    error,
}) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            title={title}
            size="sm"
            dismissible={!loading}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={loading} data-autofocus>
                        {cancelLabel}
                    </Button>
                    <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="flex gap-3 text-sm leading-relaxed text-ink-700">
                {destructive && <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-signal-600" aria-hidden="true" />}
                <div className="space-y-2">{children}</div>
            </div>
            {error && (
                <p role="alert" className="mt-3 rounded-md bg-signal-50 px-3 py-2 text-sm text-signal-700">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
