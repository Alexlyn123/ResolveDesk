import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Logo } from '@/components/ui/Logo';
import { FormError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { organizationsApi } from '@/lib/services';

function useSubmit(action, onDone) {
    const [error, setError] = useState(null);
    const [fieldError, setFieldError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function submit(event) {
        event.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        setError(null);
        setFieldError(null);
        try {
            onDone(await action());
        } catch (failure) {
            if (failure.isValidation) setFieldError(Object.values(failure.errors)[0] ?? failure.message);
            else setError(failure.message);
            setSubmitting(false);
        }
    }

    return { submit, error, fieldError, submitting, clear: () => setFieldError(null) };
}

export function WelcomePage() {
    const { user, organization, applySession, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [code, setCode] = useState('');
    const [name, setName] = useState('');

    useDocumentTitle('Choose a workspace');

    const enter = (message) => (session) => {
        applySession(session);
        toast.success(message(session));
        navigate('/dashboard', { replace: true });
    };

    const join = useSubmit(
        () => organizationsApi.join(code.trim()),
        enter((session) => `You joined ${session.current.organization.name}.`),
    );
    const create = useSubmit(
        () => organizationsApi.create({ name: name.trim() }),
        enter((session) => `${session.current.organization.name} is ready. You are its administrator.`),
    );

    return (
        <div className="flex min-h-screen flex-col px-5 py-7 sm:px-10">
            <header className="flex items-center justify-between">
                <Link to="/" className="rounded" aria-label="ResolveDesk home">
                    <Logo />
                </Link>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                        await logout();
                        navigate('/login', { replace: true });
                    }}
                >
                    Sign out
                </Button>
            </header>

            <main className="mx-auto w-full max-w-4xl flex-1 py-14 sm:py-20">
                {organization && (
                    <Link to="/dashboard" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded px-1 text-sm text-muted hover:text-ink-950">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Back to {organization.name}
                    </Link>
                )}
                <p className="eyebrow">Signed in as {user.email}</p>
                <h1 className="display mt-4 text-[2.25rem] leading-[1.08] sm:text-5xl">
                    {organization ? 'Join or create another workspace.' : `Welcome, ${user.name.split(' ')[0]}. Where do your concerns go?`}
                </h1>
                <p className="mt-4 max-w-2xl text-muted">
                    A workspace belongs to one organization. Join the one you want to raise concerns with, or set up a new one for your own team.
                </p>

                <div className="mt-12 grid gap-x-14 gap-y-12 md:grid-cols-2">
                    <section aria-labelledby="join-title">
                        <h2 id="join-title" className="border-b border-ink-950 pb-2.5 text-[0.9375rem] font-semibold text-ink-950">
                            Join with a workspace code
                        </h2>
                        <p className="mt-3 text-sm text-muted">The organization you are dealing with can give you their code. You will join as a customer.</p>
                        <form onSubmit={join.submit} noValidate className="mt-5 space-y-4">
                            <FormError>{join.error}</FormError>
                            <TextField
                                label="Workspace code"
                                value={code}
                                onChange={(event) => {
                                    setCode(event.target.value);
                                    join.clear();
                                }}
                                error={join.fieldError}
                                autoComplete="off"
                                spellCheck={false}
                                maxLength={32}
                                className="[&_input]:font-mono [&_input]:uppercase [&_input]:tracking-wider"
                                required
                            />
                            <Button type="submit" loading={join.submitting} disabled={code.trim().length === 0}>
                                Join workspace
                            </Button>
                        </form>
                    </section>

                    <section aria-labelledby="create-title">
                        <h2 id="create-title" className="border-b border-ink-950 pb-2.5 text-[0.9375rem] font-semibold text-ink-950">
                            Create a workspace
                        </h2>
                        <p className="mt-3 text-sm text-muted">
                            For your own organization. You become its administrator and can add staff, define categories, and invite customers.
                        </p>
                        <form onSubmit={create.submit} noValidate className="mt-5 space-y-4">
                            <FormError>{create.error}</FormError>
                            <TextField
                                label="Organization name"
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    create.clear();
                                }}
                                error={create.fieldError}
                                maxLength={120}
                                required
                            />
                            <Button type="submit" variant="secondary" loading={create.submitting} disabled={name.trim().length < 2}>
                                Create workspace
                            </Button>
                        </form>
                    </section>
                </div>
            </main>
        </div>
    );
}
