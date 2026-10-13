import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
    const { status } = useAuth();
    useDocumentTitle('Page not found');

    return (
        <div className="flex min-h-screen flex-col px-5 py-8 sm:px-8">
            <Link to="/" className="self-start rounded" aria-label="ResolveDesk home">
                <Logo />
            </Link>
            <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">
                <p className="eyebrow">Error 404</p>
                <h1 className="display mt-4 text-5xl leading-[1.05]">This page could not be found.</h1>
                <p className="mt-4 text-muted">The address may be mistyped, or the page may have moved.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    {status === 'authenticated' ? <Button to="/dashboard">Go to overview</Button> : <Button to="/">Back to homepage</Button>}
                </div>
            </main>
        </div>
    );
}
