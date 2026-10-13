import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, fetchCsrfCookie, onUnauthorized } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [state, setState] = useState({ status: 'loading', session: null, expired: false });

    const applySession = useCallback((session) => {
        setState({ status: 'authenticated', session, expired: false });

        return session;
    }, []);

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get('/user', { skipUnauthorizedHandler: true });

            return applySession(data.data);
        } catch (error) {
            if (error.status === 401) {
                setState({ status: 'guest', session: null, expired: false });

                return null;
            }

            // The server is unreachable: we do not know who this is. Treat as signed out.
            setState({ status: 'guest', session: null, expired: false });
            throw error;
        }
    }, [applySession]);

    useEffect(() => {
        refresh().catch(() => {});
    }, [refresh]);

    // Any request that comes back 401 means the session ended elsewhere.
    useEffect(() => {
        onUnauthorized(() => {
            setState((current) =>
                current.status === 'authenticated' ? { status: 'guest', session: null, expired: true } : current,
            );
        });

        return () => onUnauthorized(() => {});
    }, []);

    const login = useCallback(
        async (credentials) => {
            await fetchCsrfCookie();
            const { data } = await api.post('/login', credentials, { skipUnauthorizedHandler: true });

            return applySession(data.data);
        },
        [applySession],
    );

    const register = useCallback(
        async (details) => {
            await fetchCsrfCookie();
            const { data } = await api.post('/register', details, { skipUnauthorizedHandler: true });

            return applySession(data.data);
        },
        [applySession],
    );

    const logout = useCallback(async () => {
        try {
            await api.post('/logout', null, { skipUnauthorizedHandler: true });
        } finally {
            setState({ status: 'guest', session: null, expired: false });
        }
    }, []);

    const value = useMemo(() => {
        const session = state.session;
        const role = session?.current?.role ?? null;

        return {
            status: state.status,
            sessionExpired: state.expired,
            user: session?.user ?? null,
            organizations: session?.organizations ?? [],
            organization: session?.current?.organization ?? null,
            role,
            roleLabel: session?.current?.role_label ?? null,
            isCustomer: role === 'customer',
            isTeam: role === 'staff' || role === 'admin',
            isAdmin: role === 'admin',
            login,
            register,
            logout,
            refresh,
            applySession,
        };
    }, [state, login, register, logout, refresh, applySession]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside <AuthProvider>.');
    }

    return context;
}

export function AuthTestProvider({ value, children }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
