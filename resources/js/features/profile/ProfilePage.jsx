import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { FormError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { PasswordField } from '@/features/auth/PasswordField';
import { validatePassword } from '@/features/auth/validation';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ROLE_LABELS } from '@/lib/constants';
import { profileApi } from '@/lib/services';

function DetailsForm() {
    const { user, applySession } = useAuth();
    const toast = useToast();
    const [values, setValues] = useState({ name: user.name, email: user.email });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const dirty = values.name !== user.name || values.email !== user.email;
    const set = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    async function submit(event) {
        event.preventDefault();
        if (saving) return;

        const clientErrors = {};
        if (values.name.trim().length < 2) clientErrors.name = 'Enter your full name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) clientErrors.email = 'Enter a valid email address.';
        setErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) return;

        setSaving(true);
        setFormError(null);
        try {
            applySession(await profileApi.update({ name: values.name.trim(), email: values.email.trim() }));
            toast.success('Your profile was updated.');
        } catch (error) {
            if (error.isValidation) setErrors(error.errors);
            else setFormError(error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pt-4">
            <FormError>{formError}</FormError>
            <TextField label="Full name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} required />
            <TextField label="Email address" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} required />
            <Button type="submit" loading={saving} disabled={!dirty}>
                Save changes
            </Button>
        </form>
    );
}

const EMPTY_PASSWORDS = { current_password: '', password: '', password_confirmation: '' };

function PasswordForm() {
    const toast = useToast();
    const [values, setValues] = useState(EMPTY_PASSWORDS);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const set = (field) => (event) => {
        setValues((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    async function submit(event) {
        event.preventDefault();
        if (saving) return;

        const clientErrors = {};
        if (!values.current_password) clientErrors.current_password = 'Enter your current password.';
        const passwordError = validatePassword(values.password);
        if (passwordError) clientErrors.password = passwordError;
        if (values.password_confirmation !== values.password) clientErrors.password_confirmation = 'The passwords do not match.';
        setErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) return;

        setSaving(true);
        setFormError(null);
        try {
            await profileApi.updatePassword(values);
            setValues(EMPTY_PASSWORDS);
            toast.success('Your password was changed.');
        } catch (error) {
            if (error.isValidation) setErrors(error.errors);
            else setFormError(error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-5 pt-4">
            <FormError>{formError}</FormError>
            <PasswordField
                label="Current password"
                autoComplete="current-password"
                value={values.current_password}
                onChange={set('current_password')}
                error={errors.current_password}
                required
            />
            <PasswordField
                label="New password"
                autoComplete="new-password"
                value={values.password}
                onChange={set('password')}
                error={errors.password}
                hint="At least 8 characters, with a letter and a number."
                required
            />
            <PasswordField
                label="Confirm new password"
                autoComplete="new-password"
                value={values.password_confirmation}
                onChange={set('password_confirmation')}
                error={errors.password_confirmation}
                required
            />
            <Button type="submit" loading={saving}>
                Change password
            </Button>
        </form>
    );
}

function SignOut() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);

    async function signOut() {
        setSigningOut(true);
        try {
            await logout();
        } finally {
            navigate('/login', { replace: true });
        }
    }

    return (
        <div className="pt-4">
            <p className="mb-4 text-sm text-muted">End your session on this device.</p>
            <Button variant="secondary" icon={LogOut} onClick={signOut} loading={signingOut}>
                Sign out
            </Button>
        </div>
    );
}

export function ProfilePage() {
    const { organizations, organization } = useAuth();

    useDocumentTitle('Profile');

    return (
        <>
            <PageHeader title="Profile" description="Your account details. These are the same in every workspace you belong to." />

            <div className="grid max-w-5xl gap-x-16 gap-y-12 lg:grid-cols-2">
                <div className="space-y-12">
                    <Section title="Your details">
                        <DetailsForm />
                    </Section>

                    <Section title="Workspaces" description="Your role is set separately in each one.">
                        <ul className="divide-y divide-line">
                            {organizations.map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                                    <span className="min-w-0 truncate text-ink-950">
                                        {item.name}
                                        {item.id === organization?.id && <span className="ml-2 text-xs text-faint">current</span>}
                                    </span>
                                    <span className="shrink-0 text-muted">{ROLE_LABELS[item.role]}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                </div>

                <div className="space-y-12">
                    <Section title="Password">
                        <PasswordForm />
                    </Section>

                    <Section title="Session">
                        <SignOut />
                    </Section>
                </div>
            </div>
        </>
    );
}
