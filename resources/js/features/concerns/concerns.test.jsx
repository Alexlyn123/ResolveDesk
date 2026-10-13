import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoriesApi, concernsApi, membersApi } from '@/lib/services';
import { apiError, authValue, concernFixture, pageOf, renderApp } from '@/test/utils';
import { ConcernDetailPage } from './ConcernDetailPage';
import { ConcernFormPage } from './ConcernFormPage';
import { ConcernsPage } from './ConcernsPage';

vi.mock('@/lib/services', () => ({
    concernsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), assign: vi.fn(), changeStatus: vi.fn(), addComment: vi.fn() },
    categoriesApi: { list: vi.fn() },
    membersApi: { assignable: vi.fn() },
}));

const CATEGORIES = [
    { id: 3, name: 'Plumbing & water', is_active: true },
    { id: 4, name: 'Electrical', is_active: true },
];

beforeEach(() => {
    categoriesApi.list.mockResolvedValue(CATEGORIES);
    membersApi.assignable.mockResolvedValue([{ id: 21, name: 'Daniel Okafor' }]);
});

describe('submitting a concern', () => {
    it('validates required fields before sending', async () => {
        const user = userEvent.setup();
        renderApp(<ConcernFormPage />, { route: '/concerns/create', path: '/concerns/create' });

        await user.click(await screen.findByRole('button', { name: 'Submit concern' }));

        expect(await screen.findByText('Give the concern a short title.')).toBeInTheDocument();
        expect(screen.getByText('Describe the concern.')).toBeInTheDocument();
        expect(screen.getByText('Choose a category.')).toBeInTheDocument();
        expect(concernsApi.create).not.toHaveBeenCalled();
    });

    it('creates the concern and opens its page', async () => {
        const user = userEvent.setup();
        concernsApi.create.mockResolvedValue(concernFixture({ id: 41, reference: 'RD-2026-000041' }));
        renderApp(<ConcernFormPage />, { route: '/concerns/create', path: '/concerns/create' });

        await user.type(screen.getByLabelText(/Title/), 'Water leaking under the sink');
        await screen.findByRole('option', { name: 'Plumbing & water' });
        await user.selectOptions(screen.getByLabelText(/Category/), '3');
        await user.type(screen.getByLabelText(/Description/), 'There is a steady drip under the kitchen sink.');
        await user.click(screen.getByRole('radio', { name: /Urgent/ }));
        await user.click(screen.getByRole('button', { name: 'Submit concern' }));

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/concerns/41'));

        // Exactly these fields: no creator, organization, status, or due date from a customer.
        expect(concernsApi.create).toHaveBeenCalledWith({
            title: 'Water leaking under the sink',
            description: 'There is a steady drip under the kitchen sink.',
            category_id: 3,
            priority: 'urgent',
        });
        expect(await screen.findByText('Concern RD-2026-000041 was submitted.')).toBeInTheDocument();
    });

    it('offers a target date to staff but not to customers', async () => {
        const { unmount } = renderApp(<ConcernFormPage />, { route: '/concerns/create', path: '/concerns/create' });
        await screen.findByRole('button', { name: 'Submit concern' });
        expect(screen.queryByLabelText(/Target date/)).not.toBeInTheDocument();
        unmount();

        renderApp(<ConcernFormPage />, { auth: authValue('staff'), route: '/concerns/create', path: '/concerns/create' });
        expect(await screen.findByLabelText(/Target date/)).toBeInTheDocument();
    });

    it('maps server validation errors onto the fields', async () => {
        const user = userEvent.setup();
        concernsApi.create.mockRejectedValue(apiError(422, 'Invalid.', { category_id: 'Choose one of the available categories.' }));
        renderApp(<ConcernFormPage />, { route: '/concerns/create', path: '/concerns/create' });

        await user.type(screen.getByLabelText(/Title/), 'Water leaking under the sink');
        await screen.findByRole('option', { name: 'Electrical' });
        await user.selectOptions(screen.getByLabelText(/Category/), '4');
        await user.type(screen.getByLabelText(/Description/), 'There is a steady drip under the kitchen sink.');
        await user.click(screen.getByRole('button', { name: 'Submit concern' }));

        expect(await screen.findByText('Choose one of the available categories.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit concern' })).toBeEnabled();
    });
});

describe('the concern list', () => {
    const rows = [
        concernFixture(),
        concernFixture({ id: 13, reference: 'RD-2026-000013', title: 'Hallway light flickering', priority: 'low', permissions: { ...concernFixture().permissions, delete: false } }),
    ];

    it('loads the first page from the server and shows the rows', async () => {
        concernsApi.list.mockResolvedValue(pageOf(rows, { total: 2 }));
        renderApp(<ConcernsPage />, { route: '/concerns', path: '/concerns' });

        expect((await screen.findAllByText('Water leaking under the sink')).length).toBeGreaterThan(0);
        expect(concernsApi.list).toHaveBeenCalledWith({ sort: 'created_at', direction: 'desc', page: 1, per_page: 15 });
    });

    it('sends search and filters to the server instead of filtering in the browser', async () => {
        const user = userEvent.setup();
        concernsApi.list.mockResolvedValue(pageOf(rows));
        renderApp(<ConcernsPage />, { auth: authValue('staff'), route: '/concerns?page=3', path: '/concerns' });
        await screen.findAllByText('Water leaking under the sink');

        await user.type(screen.getByRole('searchbox'), 'leak');
        await waitFor(() => expect(concernsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'leak', page: 1 })));

        await user.click(screen.getByRole('tab', { name: 'In progress' }));
        await waitFor(() => expect(concernsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'leak', status: 'in_progress' })));

        await user.click(screen.getByRole('button', { name: /Filters/ }));
        await user.selectOptions(screen.getByLabelText('Priority'), 'urgent');
        await user.selectOptions(screen.getByLabelText('Assigned to'), 'unassigned');
        await user.selectOptions(screen.getByLabelText('Sort concerns'), 'priority:desc');

        await waitFor(() =>
            expect(concernsApi.list).toHaveBeenLastCalledWith({
                search: 'leak',
                status: 'in_progress',
                priority: 'urgent',
                assignee: 'unassigned',
                sort: 'priority',
                direction: 'desc',
                page: 1,
                per_page: 15,
            }),
        );
        expect(screen.getByTestId('location')).toHaveTextContent('status=in_progress');

        await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
        await waitFor(() => expect(concernsApi.list).toHaveBeenLastCalledWith({ sort: 'created_at', direction: 'desc', page: 1, per_page: 15 }));
    });

    it('hides the assignee filter from customers', async () => {
        const user = userEvent.setup();
        concernsApi.list.mockResolvedValue(pageOf(rows));
        renderApp(<ConcernsPage />, { route: '/concerns', path: '/concerns' });
        await screen.findAllByText('Water leaking under the sink');

        await user.click(screen.getByRole('button', { name: /Filters/ }));

        expect(screen.getByLabelText('Priority')).toBeInTheDocument();
        expect(screen.queryByLabelText('Assigned to')).not.toBeInTheDocument();
    });

    it('requests another page when the pagination is used', async () => {
        const user = userEvent.setup();
        concernsApi.list.mockResolvedValue(pageOf(rows, { current_page: 1, last_page: 3, from: 1, to: 15, total: 40 }));
        renderApp(<ConcernsPage />, { route: '/concerns', path: '/concerns' });

        expect(await screen.findByText(/Showing/)).toHaveTextContent('Showing 1–15 of 40 concerns');
        expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();

        await user.click(screen.getByRole('button', { name: /Next/ }));
        await waitFor(() => expect(concernsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

        await user.click(screen.getByRole('button', { name: 'Page 3' }));
        await waitFor(() => expect(concernsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 })));
    });

    it('shows an error with a working retry when loading fails', async () => {
        const user = userEvent.setup();
        concernsApi.list.mockRejectedValueOnce(apiError(500, 'Something went wrong on our side. Please try again in a moment.'));
        concernsApi.list.mockResolvedValue(pageOf(rows));
        renderApp(<ConcernsPage />, { route: '/concerns', path: '/concerns' });

        expect(await screen.findByText('The concern list could not be loaded')).toBeInTheDocument();
        expect(screen.getByText(/Something went wrong on our side/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Try again' }));

        expect((await screen.findAllByText('Water leaking under the sink')).length).toBeGreaterThan(0);
    });

    it('distinguishes an empty workspace from filters that match nothing', async () => {
        concernsApi.list.mockResolvedValue(pageOf([]));
        const { unmount } = renderApp(<ConcernsPage />, { route: '/concerns', path: '/concerns' });
        expect(await screen.findByText('You have not submitted any concerns yet')).toBeInTheDocument();
        unmount();

        renderApp(<ConcernsPage />, { route: '/concerns?search=zzz', path: '/concerns' });
        expect(await screen.findByText('No concerns match these filters')).toBeInTheDocument();
    });

    it('only offers the row actions the server permits, and confirms before deleting', async () => {
        const user = userEvent.setup();
        concernsApi.list.mockResolvedValue(pageOf(rows));
        concernsApi.remove.mockResolvedValue({});
        renderApp(<ConcernsPage />, { route: '/concerns', path: '/concerns' });
        await screen.findAllByText('Water leaking under the sink');

        // The second concern may not be deleted: no such menu item.
        await user.click(screen.getAllByRole('button', { name: 'Actions for RD-2026-000013' })[0]);
        expect(screen.getByRole('menuitem', { name: 'View' })).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: 'Assign' })).not.toBeInTheDocument();
        await user.keyboard('{Escape}');

        await user.click(screen.getAllByRole('button', { name: 'Actions for RD-2026-000012' })[0]);
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Withdraw this concern?')).toBeInTheDocument();

        // Cancelling does nothing.
        await user.click(within(dialog).getByRole('button', { name: 'Keep it' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(concernsApi.remove).not.toHaveBeenCalled();

        await user.click(screen.getAllByRole('button', { name: 'Actions for RD-2026-000012' })[0]);
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Withdraw concern' }));

        await waitFor(() => expect(concernsApi.remove).toHaveBeenCalledWith(12));
        // The list is re-read from the server afterwards.
        await waitFor(() => expect(concernsApi.list).toHaveBeenCalledTimes(2));
    });
});

describe('changing status on the concern page', () => {
    const inProgress = concernFixture({
        status: 'in_progress',
        assignee: { id: 21, name: 'Daniel Okafor' },
        permissions: { update: true, delete: false, assign: true, change_status: true, comment: true, comment_internally: true },
        transitions: [
            { status: 'resolved', label: 'Resolved', requires: 'resolution' },
            { status: 'waiting_for_customer', label: 'Waiting for customer', requires: 'note' },
        ],
    });

    function open() {
        concernsApi.get.mockResolvedValue(inProgress);

        return renderApp(<ConcernDetailPage />, { auth: authValue('staff'), route: '/concerns/12', path: '/concerns/:id' });
    }

    it('lets staff accept an unowned concern in one click, which assigns it and starts the review', async () => {
        const user = userEvent.setup();
        const unowned = concernFixture({
            permissions: { update: true, delete: true, assign: true, change_status: true, comment: true, comment_internally: true },
            transitions: [{ status: 'under_review', label: 'Under review', requires: null }],
        });
        const assigned = { ...unowned, assignee: { id: 7, name: 'Sam Rivera' } };
        const reviewing = { ...assigned, status: 'under_review', transitions: [] };
        concernsApi.get.mockResolvedValue(unowned);
        concernsApi.assign.mockResolvedValue(assigned);
        concernsApi.changeStatus.mockResolvedValue(reviewing);
        renderApp(<ConcernDetailPage />, { auth: authValue('staff'), route: '/concerns/12', path: '/concerns/:id' });

        await user.click(await screen.findByRole('button', { name: 'Accept concern' }));

        await waitFor(() => expect(concernsApi.assign).toHaveBeenCalledWith(12, 7));
        await waitFor(() => expect(concernsApi.changeStatus).toHaveBeenCalledWith(12, 'under_review'));
        expect(await screen.findByText('You accepted RD-2026-000012.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Accept concern' })).not.toBeInTheDocument();
    });

    it('requires a resolution note before resolving', async () => {
        const user = userEvent.setup();
        concernsApi.changeStatus.mockResolvedValue({ ...inProgress, status: 'resolved', resolution_note: 'Replaced the valve and tested it.', resolved_at: '2026-10-13T10:00:00+00:00', transitions: [] });
        open();

        await user.click(await screen.findByRole('button', { name: 'Mark resolved' }));
        const dialog = await screen.findByRole('dialog');

        await user.click(within(dialog).getByRole('button', { name: 'Mark resolved' }));
        expect(await within(dialog).findByText(/Describe how the concern was resolved/)).toBeInTheDocument();
        expect(concernsApi.changeStatus).not.toHaveBeenCalled();

        await user.type(within(dialog).getByLabelText(/Resolution note/), 'Replaced the valve and tested it.');
        await user.click(within(dialog).getByRole('button', { name: 'Mark resolved' }));

        await waitFor(() => expect(concernsApi.changeStatus).toHaveBeenCalledWith(12, 'resolved', 'Replaced the valve and tested it.'));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

        // The page now shows what the server returned.
        expect(await screen.findByRole('heading', { name: 'Resolution' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Mark resolved' })).not.toBeInTheDocument();
    });

    it('keeps the dialog open and shows the reason when the server rejects a transition', async () => {
        const user = userEvent.setup();
        concernsApi.changeStatus.mockRejectedValue(apiError(422, 'Invalid.', { status: 'A concern that is closed cannot be moved to resolved.' }));
        open();

        await user.click(await screen.findByRole('button', { name: 'Mark resolved' }));
        const dialog = await screen.findByRole('dialog');
        await user.type(within(dialog).getByLabelText(/Resolution note/), 'Replaced the valve and tested it.');
        await user.click(within(dialog).getByRole('button', { name: 'Mark resolved' }));

        expect(await within(dialog).findByText('A concern that is closed cannot be moved to resolved.')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('offers customers no status or assignment controls, and never an internal-note option', async () => {
        concernsApi.get.mockResolvedValue(concernFixture());
        renderApp(<ConcernDetailPage />, { route: '/concerns/12', path: '/concerns/:id' });

        expect(await screen.findByRole('heading', { name: 'Water leaking under the sink' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Assign|Start review|Mark resolved/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: 'Internal note' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Post message' })).toBeInTheDocument();
    });

    it('explains a concern the user may not see', async () => {
        concernsApi.get.mockRejectedValue(apiError(403, 'You do not have access to this concern.'));
        renderApp(<ConcernDetailPage />, { route: '/concerns/99', path: '/concerns/:id' });

        expect(await screen.findByRole('heading', { name: 'You do not have access to this concern' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });
});
