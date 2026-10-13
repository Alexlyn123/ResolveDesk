import { forwardRef, useId } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cx } from '@/lib/format';

export function Field({ label, error, hint, required, optional, className, children }) {
    const id = useId();
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-ink-900">
                <span>
                    {label}
                    {required && (
                        <span className="ml-0.5 text-signal-600" aria-hidden="true">
                            *
                        </span>
                    )}
                </span>
                {optional && <span className="text-xs font-normal text-faint">Optional</span>}
            </label>

            {children({
                id,
                required,
                'aria-invalid': error ? 'true' : undefined,
                'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
            })}

            {error ? (
                <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-signal-700">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={hintId} className="mt-1.5 text-[0.8125rem] text-muted">
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx('field-control h-10', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cx('field-control resize-y leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
    return (
        <div className={cx('relative', className)}>
            <select ref={ref} className="field-control h-10 appearance-none pr-9" {...props}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        </div>
    );
});

export function TextField({ label, error, hint, required, optional, className, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} required={required} optional={optional} className={className}>
            {(control) => <Input {...control} {...props} />}
        </Field>
    );
}

export function TextAreaField({ label, error, hint, required, optional, className, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} required={required} optional={optional} className={className}>
            {(control) => <Textarea {...control} {...props} />}
        </Field>
    );
}

export function SelectField({ label, error, hint, required, optional, className, children, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} required={required} optional={optional} className={className}>
            {(control) => (
                <Select {...control} {...props}>
                    {children}
                </Select>
            )}
        </Field>
    );
}
