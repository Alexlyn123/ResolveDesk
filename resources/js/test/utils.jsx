import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthTestProvider } from '@/features/auth/AuthContext';
import { ApiError } from '@/lib/api';

const ORGANIZATION = { id: 1, name: 'Northgate Residences', slug: 'northgate-residences' };

export function authValue(role = 'customer', overrides = {}) {
    const signedIn = role !== null;

    return {
        status: signedIn ? 'authenticated' : 'guest',
        sessionExpired: false,
        user: signedIn ? { id: 7, name: 'Sam Rivera', email: 'sam@example.com' } : null,
        organizations: signedIn ? [{ ...ORGANIZATION, role }] : [],
        organization: signedIn ? ORGANIZATION : null,
        role,
        isCustomer: role === 'customer',
        isTeam: role === 'staff' || role === 'admin',
        isAdmin: role === 'admin',
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refresh: vi.fn(),
        applySession: vi.fn(),
        ...overrides,
    };
}

function LocationProbe() {
    const location = useLocation();

    return <output data-testid="location">{location.pathname + location.search}</output>;
}

export function renderApp(element, { auth = authValue(), route = '/', path = '*' } = {}) {
    return {
        auth,
        ...render(
            <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ToastProvider>
                    <AuthTestProvider value={auth}>
                        <Routes>
                            <Route path={path} element={element} />
                            {path !== '*' && <Route path="*" element={null} />}
                        </Routes>
                        <LocationProbe />
                    </AuthTestProvider>
                </ToastProvider>
            </MemoryRouter>,
        ),
    };
}

export function apiError(status, message, errors = {}) {
    return new ApiError({ status, message, errors });
}

export function concernFixture(overrides = {}) {
    return {
        id: 12,
        reference: 'RD-2026-000012',
        title: 'Water leaking under the sink',
        excerpt: 'There is a steady drip.',
        description: 'There is a steady drip under the kitchen sink.',
        priority: 'high',
        status: 'open',
        category: { id: 3, name: 'Plumbing & water' },
        creator: { id: 7, name: 'Sam Rivera', email: 'sam@example.com' },
        assignee: null,
        due_at: null,
        due_on: null,
        is_overdue: false,
        resolved_at: null,
        closed_at: null,
        resolution_note: null,
        created_at: '2026-10-12T09:00:00+00:00',
        updated_at: '2026-10-12T09:00:00+00:00',
        permissions: { update: true, delete: true, assign: false, change_status: false, comment: true, comment_internally: false },
        transitions: [],
        comments: [],
        status_history: [],
        activities: [],
        ...overrides,
    };
}

export function pageOf(concerns, meta = {}) {
    return {
        data: concerns,
        meta: { current_page: 1, last_page: 1, from: concerns.length ? 1 : null, to: concerns.length || null, total: concerns.length, per_page: 15, ...meta },
    };
}
