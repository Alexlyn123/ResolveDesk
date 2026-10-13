import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { cx } from '@/lib/format';

const ToastContext = createContext(null);

const DURATION = 5000;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (type, message) => {
            const id = nextId.current++;
            setToasts((current) => [...current.slice(-2), { id, type, message }]);
            // Errors stay a little longer; they usually need reading twice.
            setTimeout(() => dismiss(id), type === 'error' ? DURATION + 2500 : DURATION);
        },
        [dismiss],
    );

    const value = useMemo(
        () => ({
            success: (message) => push('success', message),
            error: (message) => push('error', message),
        }),
        [push],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
                role="region"
                aria-label="Notifications"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        className={cx(
                            'pointer-events-auto flex w-full max-w-sm animate-rise-in items-start gap-3 rounded-lg border-l-[3px] bg-ink-950 py-3 pl-3.5 pr-2 text-sm text-paper shadow-xl shadow-ink-950/25',
                            toast.type === 'error' ? 'border-signal-300' : 'border-jade-300',
                        )}
                    >
                        {toast.type === 'error' ? (
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-signal-300" aria-hidden="true" />
                        ) : (
                            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-jade-300" aria-hidden="true" />
                        )}
                        <p className="flex-1 leading-snug">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            aria-label="Dismiss notification"
                            className="on-dark -my-1 rounded p-1.5 text-ink-300 hover:bg-white/10 hover:text-paper"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used inside <ToastProvider>.');
    }

    return context;
}
