import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { navigationFor } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Pagination } from '@/components/ui/Pagination';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { toApiError } from '@/lib/api';
import { transitionLabel } from '@/lib/constants';
import { authValue, renderApp } from '@/test/utils';

vi.mock('@/lib/services', () => ({ organizationsApi: { switchTo: vi.fn() }, profileApi: { update: vi.fn(), updatePassword: vi.fn() } }));

const labels = (role) => navigationFor(role).flatMap((group) => group.items.map((item) => item.label));

describe('role-aware navigation', () => {
    it('gives customers only their own areas', () => {
        expect(labels('customer')).toEqual(['Overview', 'My concerns', 'Submit concern', 'Profile']);
    });

    it('adds assigned work, organization concerns, and reports for staff', () => {
        expect(labels('staff')).toEqual(['Overview', 'My assigned concerns', 'Organization concerns', 'Submit concern', 'Reports', 'Profile']);
    });

    it('adds workspace administration for administrators only', () => {
        expect(labels('admin')).toEqual(expect.arrayContaining(['Team management', 'Categories', 'Organization settings', 'Reports']));
        expect(labels('staff')).not.toEqual(expect.arrayContaining(['Team management']));
    });

    it('renders the links for the signed-in role and marks the current page', () => {
        renderApp(<Sidebar />, { auth: authValue('staff'), route: '/concerns?assignee=me&status=active' });

        expect(screen.getByRole('link', { name: 'My assigned concerns' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Organization concerns' })).not.toHaveAttribute('aria-current');
        expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Team management' })).not.toBeInTheDocument();
    });

    it('has no sign-out control in the sidebar; it lives on the profile page', async () => {
        const user = userEvent.setup();
        const auth = authValue('customer');
        auth.logout.mockResolvedValue();

        const { unmount } = renderApp(<Sidebar />, { auth, route: '/dashboard', path: '/dashboard' });
        expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
        unmount();

        renderApp(<ProfilePage />, { auth, route: '/profile', path: '/profile' });
        await user.click(screen.getByRole('button', { name: 'Sign out' }));

        expect(auth.logout).toHaveBeenCalled();
        expect(await screen.findByTestId('location')).toHaveTextContent('/login');
    });
});

describe('ConfirmDialog', () => {
    function setup(props = {}) {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmDialog open title="Delete this concern?" confirmLabel="Delete concern" destructive onConfirm={onConfirm} onCancel={onCancel} {...props}>
                <p>This cannot be undone from here.</p>
            </ConfirmDialog>,
        );

        return { onConfirm, onCancel };
    }

    it('is an accessible modal that focuses the safe choice first', () => {
        setup();

        expect(screen.getByRole('dialog', { name: 'Delete this concern?' })).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    it('confirms only when the confirm button is pressed', async () => {
        const user = userEvent.setup();
        const { onConfirm, onCancel } = setup();

        await user.click(screen.getByRole('button', { name: 'Delete concern' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('cancels with the button or the Escape key', async () => {
        const user = userEvent.setup();
        const { onConfirm, onCancel } = setup();

        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        await user.keyboard('{Escape}');

        expect(onCancel).toHaveBeenCalledTimes(2);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('cannot be dismissed or re-submitted while the action is running', async () => {
        const user = userEvent.setup();
        const { onConfirm, onCancel } = setup({ loading: true });

        expect(screen.getByRole('button', { name: 'Delete concern' })).toBeDisabled();
        await user.keyboard('{Escape}');

        expect(onCancel).not.toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('renders nothing when closed', () => {
        render(<ConfirmDialog open={false} title="Hidden" onConfirm={() => {}} onCancel={() => {}} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

describe('Pagination', () => {
    it('disables the edges and reports the range', async () => {
        const user = userEvent.setup();
        const onPageChange = vi.fn();
        render(<Pagination meta={{ current_page: 3, last_page: 3, from: 31, to: 40, total: 40 }} onPageChange={onPageChange} noun="concern" />);

        expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 31–40 of 40 concerns');
        expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');

        await user.click(screen.getByRole('button', { name: /Previous/ }));
        expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('is omitted when there is nothing to page through', () => {
        const { container } = render(<Pagination meta={{ current_page: 1, last_page: 1, from: null, to: null, total: 0 }} onPageChange={() => {}} />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('shared helpers', () => {
    it('labels every status in words, not colour alone', () => {
        render(<StatusIndicator status="waiting_for_customer" />);

        expect(screen.getByText('Waiting for customer')).toBeInTheDocument();
    });

    it('names transitions from the point of view of the person acting', () => {
        expect(transitionLabel('open', 'under_review', 'staff')).toBe('Start review');
        expect(transitionLabel('waiting_for_customer', 'in_progress', 'staff')).toBe('Resume work');
        expect(transitionLabel('closed', 'in_progress', 'admin')).toBe('Reopen');
        expect(transitionLabel('resolved', 'closed', 'customer')).toBe('Confirm and close');
        expect(transitionLabel('open', 'closed', 'staff')).toBe('Close without resolving');
    });

    it('turns HTTP failures into safe, readable errors', () => {
        const validation = toApiError({ response: { status: 422, data: { message: 'The title field is required.', errors: { title: ['The title field is required.', 'x'] } } } });
        expect(validation.isValidation).toBe(true);
        expect(validation.errors).toEqual({ title: 'The title field is required.' });

        // Internal details from a server error are never shown.
        const server = toApiError({ response: { status: 500, data: { message: 'SQLSTATE[42S02]: Base table not found', exception: 'QueryException' } } });
        expect(server.message).not.toContain('SQLSTATE');
        expect(server.message).toMatch(/went wrong on our side/);

        const network = toApiError({ request: {} });
        expect(network.isNetwork).toBe(true);
        expect(network.message).toMatch(/could not reach the server/);

        expect(toApiError({ response: { status: 403, data: { message: 'Only staff can assign concerns.' } } }).message).toBe('Only staff can assign concerns.');
    });
});
