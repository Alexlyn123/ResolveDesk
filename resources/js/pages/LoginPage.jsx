import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthContext';
import { PasswordField } from '@/features/auth/PasswordField';
import { validateLogin } from '@/features/auth/validation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// Shown only when explicitly enabled for local demonstrations.
const SHOW_DEMO_ACCOUNTS = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

const DEMO_ACCOUNTS = [
    { role: 'Administrator', email: 'admin@resolvedesk.test' },
    { role: 'Staff · Ben10', email: 'ben10@resolvedesk.test' },
    { role: 'Staff · Guko', email: 'guko@resolvedesk.test' },
    { role: 'Staff · Dino', email: 'dino@resolvedesk.test' },
    { role: 'Staff · Barney', email: 'barney@resolvedesk.test' },
];

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [values, setValues] = useState({ email: '', password: '', remember: false });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useDocumentTitle('Sign in');

    const set = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    async function onSubmit(event) {
        event.preventDefault();
        if (submitting) return;

        const clientErrors = validateLogin(values);
        setErrors(clientErrors);
        setFormError(null);

        if (Object.keys(clientErrors).length > 0) return;

        setSubmitting(true);
        try {
            await login({ email: values.email.trim(), password: values.password, remember: values.remember });
            navigate(location.state?.from || '/dashboard', { replace: true });
        } catch (error) {
            if (error.isValidation || error.status === 429) {
                // Wrong credentials and lockouts both come back against the email field.
                setFormError(error.errors.email ?? error.message);
            } else {
                setFormError(error.message);
            }
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout
            title="Sign in"
            lead="Pick up where you left off."
            footer={
                <>
                    New to ResolveDesk?{' '}
                    <Link to="/register" className="rounded font-medium text-ink-950 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-950">
                        Create an account
                    </Link>
                </>
            }
        >
            {location.state?.expired && !formError && (
                <p role="status" className="mb-5 rounded-md border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                    Your session ended. Sign in again to continue.
                </p>
            )}

            <form onSubmit={onSubmit} noValidate className="space-y-5">
                <FormError>{formError}</FormError>

                <TextField
                    label="Email address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    value={values.email}
                    onChange={set('email')}
                    error={errors.email}
                    required
                    autoFocus
                />

                <PasswordField
                    label="Password"
                    name="password"
                    autoComplete="current-password"
                    value={values.password}
                    onChange={set('password')}
                    error={errors.password}
                    required
                />

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800">
                    <input
                        type="checkbox"
                        name="remember"
                        checked={values.remember}
                        onChange={set('remember')}
                        className="h-4 w-4 rounded border-paper-300 accent-ink-950"
                    />
                    Keep me signed in on this device
                </label>

                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {submitting ? 'Signing in' : 'Sign in'}
                </Button>
            </form>

            {SHOW_DEMO_ACCOUNTS && (
                <details className="mt-6 rounded-md border border-dashed border-paper-300 px-4 py-3 text-sm">
                    <summary className="cursor-pointer rounded font-medium text-ink-800">Demo accounts (local development)</summary>
                    <ul className="mt-3 space-y-2">
                        {DEMO_ACCOUNTS.map((account) => (
                            <li key={account.email} className="flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                    <span className="block text-ink-900">{account.role}</span>
                                    <span className="block truncate font-mono text-xs text-muted">{account.email}</span>
                                </span>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setValues((current) => ({ ...current, email: account.email, password: 'password' }));
                                        setErrors({});
                                        setFormError(null);
                                    }}
                                >
                                    Fill in
                                </Button>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </AuthLayout>
    );
}
