import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { useAuth } from '@/features/auth/AuthContext';
import { PasswordField } from '@/features/auth/PasswordField';
import { validateRegistration } from '@/features/auth/validation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const INITIAL = { name: '', email: '', password: '', password_confirmation: '', workspace_code: '' };

export function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [values, setValues] = useState(INITIAL);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useDocumentTitle('Create an account');

    const set = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    async function onSubmit(event) {
        event.preventDefault();
        if (submitting) return;

        const clientErrors = validateRegistration(values);
        setErrors(clientErrors);
        setFormError(null);

        if (Object.keys(clientErrors).length > 0) return;

        setSubmitting(true);
        try {
            // Only these fields are sent. Roles are decided by the server.
            const session = await register({
                name: values.name.trim(),
                email: values.email.trim(),
                password: values.password,
                password_confirmation: values.password_confirmation,
                workspace_code: values.workspace_code.trim() || null,
            });
            navigate(session.current ? '/dashboard' : '/welcome', { replace: true });
        } catch (error) {
            if (error.isValidation) {
                setErrors(error.errors);
                setFormError('Please check the highlighted fields.');
            } else {
                setFormError(error.message);
            }
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout
            title="Create your account"
            lead="Submit concerns and follow each one through to its resolution."
            footer={
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="rounded font-medium text-ink-950 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-950">
                        Sign in
                    </Link>
                </>
            }
        >
            <form onSubmit={onSubmit} noValidate className="space-y-5">
                <FormError>{formError}</FormError>

                <TextField label="Full name" name="name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} required autoFocus />

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
                />

                <PasswordField
                    label="Password"
                    name="password"
                    autoComplete="new-password"
                    value={values.password}
                    onChange={set('password')}
                    error={errors.password}
                    hint="At least 8 characters, with a letter and a number."
                    required
                />

                <PasswordField
                    label="Confirm password"
                    name="password_confirmation"
                    autoComplete="new-password"
                    value={values.password_confirmation}
                    onChange={set('password_confirmation')}
                    error={errors.password_confirmation}
                    required
                />

                <TextField
                    label="Workspace code"
                    name="workspace_code"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={values.workspace_code}
                    onChange={set('workspace_code')}
                    error={errors.workspace_code}
                    hint="If an organization gave you a code, enter it to join their workspace."
                    optional
                    className="[&_input]:font-mono [&_input]:uppercase [&_input]:tracking-wider"
                />

                <Button type="submit" size="lg" loading={submitting} className="w-full">
                    {submitting ? 'Creating account' : 'Create account'}
                </Button>
            </form>
        </AuthLayout>
    );
}
