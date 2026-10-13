import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field, Input } from '@/components/ui/Field';

export function PasswordField({ label, error, hint, required, ...props }) {
    const [visible, setVisible] = useState(false);

    return (
        <Field label={label} error={error} hint={hint} required={required}>
            {(control) => (
                <div className="relative">
                    <Input {...control} {...props} type={visible ? 'text' : 'password'} className="pr-11" />
                    <button
                        type="button"
                        onClick={() => setVisible((value) => !value)}
                        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                        aria-pressed={visible}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-faint hover:text-ink-900 focus-visible:ring-inset"
                    >
                        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                </div>
            )}
        </Field>
    );
}
