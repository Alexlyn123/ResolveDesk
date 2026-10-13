import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { useAuth } from './AuthContext';

function FullPageLoader() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <LoadingState label="Loading your workspace" />
        </div>
    );
}

export function RequireAuth({ requireWorkspace = true }) {
    const { status, organization, sessionExpired } = useAuth();
    const location = useLocation();

    if (status === 'loading') return <FullPageLoader />;

    if (status === 'guest') {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search, expired: sessionExpired }} />;
    }

    if (requireWorkspace && !organization) {
        return <Navigate to="/welcome" replace />;
    }

    return <Outlet />;
}

export function GuestOnly() {
    const { status } = useAuth();
    const location = useLocation();

    if (status === 'loading') return <FullPageLoader />;
    if (status === 'authenticated') return <Navigate to={location.state?.from || '/dashboard'} replace />;

    return <Outlet />;
}

export function RequireRole({ roles }) {
    const { role } = useAuth();

    if (!roles.includes(role)) {
        return (
            <EmptyState
                icon={ShieldAlert}
                title="This area is not available to your role"
                action={<Button to="/dashboard">Back to overview</Button>}
                className="py-24"
            >
                Ask an organization administrator if you think you should have access.
            </EmptyState>
        );
    }

    return <Outlet />;
}
