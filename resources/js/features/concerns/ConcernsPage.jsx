import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ellipsis, Eye, Inbox, Pencil, Plus, RefreshCw, SearchX, Trash2, UserPlus } from 'lucide-react';
import { Person } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { cx, formatDateTime, formatRelative } from '@/lib/format';
import { categoriesApi, concernsApi, membersApi } from '@/lib/services';
import { AssignDialog, DeleteConcernDialog } from './ConcernDialogs';
import { ConcernFilters } from './ConcernFilters';
import { OverdueFlag } from './ConcernList';

const FILTER_KEYS = ['search', 'status', 'priority', 'category_id', 'assignee', 'created_from', 'created_to', 'overdue', 'sort'];
const PER_PAGE = 15;

function RowActions({ concern, onAssign, onDelete }) {
    const { permissions } = concern;

    const items = [
        { label: 'View', icon: Eye, to: `/concerns/${concern.id}` },
        permissions.update && { label: 'Edit', icon: Pencil, to: `/concerns/${concern.id}/edit` },
        permissions.assign && { label: concern.assignee ? 'Reassign' : 'Assign', icon: UserPlus, onSelect: () => onAssign(concern) },
        permissions.delete && 'divider',
        permissions.delete && { label: 'Delete', icon: Trash2, danger: true, onSelect: () => onDelete(concern) },
    ].filter(Boolean);

    return (
        <Dropdown
            label={`Actions for ${concern.reference}`}
            items={items}
            trigger={<IconButton icon={Ellipsis} label={`Actions for ${concern.reference}`} />}
        />
    );
}

function ConcernTable({ concerns, isTeam, onAssign, onDelete }) {
    const heading = 'whitespace-nowrap px-3 py-2.5 text-left font-mono text-2xs font-medium uppercase tracking-[0.1em] text-faint first:pl-0';

    return (
        <table className="hidden w-full border-collapse md:table">
            <thead>
                <tr className="border-b border-ink-950">
                    <th scope="col" className={heading}>
                        Ticket
                    </th>
                    <th scope="col" className={heading}>
                        Concern
                    </th>
                    <th scope="col" className={cx(heading, 'hidden xl:table-cell')}>
                        Category
                    </th>
                    <th scope="col" className={heading}>
                        Priority
                    </th>
                    <th scope="col" className={heading}>
                        Status
                    </th>
                    <th scope="col" className={cx(heading, 'hidden lg:table-cell')}>
                        Assigned to
                    </th>
                    <th scope="col" className={heading}>
                        Last updated
                    </th>
                    <th scope="col" className="w-10 py-2.5">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {concerns.map((concern) => (
                    <tr key={concern.id} className="group border-b border-line transition-colors hover:bg-ink-950/[0.025]">
                        <td className="py-3.5 pr-3 align-top">
                            <span className="ticket">{concern.reference}</span>
                        </td>
                        <td className="max-w-0 px-3 py-3.5 align-top" style={{ width: '34%' }}>
                            <Link
                                to={`/concerns/${concern.id}`}
                                className="block truncate rounded font-medium text-ink-950 hover:underline hover:decoration-ink-300 hover:underline-offset-4"
                            >
                                {concern.title}
                            </Link>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[0.8125rem] text-muted">
                                {isTeam && concern.creator && <span className="truncate">{concern.creator.name}</span>}
                                <span className="xl:hidden">{concern.category?.name}</span>
                                <OverdueFlag concern={concern} />
                            </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3.5 align-top text-[0.8125rem] text-ink-700 xl:table-cell">{concern.category?.name}</td>
                        <td className="px-3 py-3.5 align-top">
                            <PriorityIndicator priority={concern.priority} />
                        </td>
                        <td className="px-3 py-3.5 align-top">
                            <StatusIndicator status={concern.status} />
                        </td>
                        <td className="hidden px-3 py-3.5 align-top lg:table-cell">
                            <Person person={concern.assignee} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 align-top text-[0.8125rem] text-muted" title={formatDateTime(concern.updated_at)}>
                            {formatRelative(concern.updated_at)}
                        </td>
                        <td className="py-2 align-top">
                            <RowActions concern={concern} onAssign={onAssign} onDelete={onDelete} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ConcernCards({ concerns, isTeam, onAssign, onDelete }) {
    return (
        <ul className="divide-y divide-line border-y border-line md:hidden">
            {concerns.map((concern) => (
                <li key={concern.id} className="flex gap-2 py-4">
                    <Link to={`/concerns/${concern.id}`} className="min-w-0 flex-1 rounded">
                        <span className="flex items-center justify-between gap-3">
                            <span className="ticket">{concern.reference}</span>
                            <StatusIndicator status={concern.status} />
                        </span>
                        <span className="mt-1.5 block font-medium leading-snug text-ink-950">{concern.title}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
                            <PriorityIndicator priority={concern.priority} />
                            <span>{concern.category?.name}</span>
                            {isTeam && <Person person={concern.assignee} />}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-faint">
                            <span>Updated {formatRelative(concern.updated_at)}</span>
                            <OverdueFlag concern={concern} />
                        </span>
                    </Link>
                    <div className="-mr-2 -mt-1.5">
                        <RowActions concern={concern} onAssign={onAssign} onDelete={onDelete} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function ConcernsPage() {
    const { user, organization, isTeam } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [assigning, setAssigning] = useState(null);
    const [deleting, setDeleting] = useState(null);

    // The URL is the single source of truth for filters, sort, and page.
    const filters = useMemo(
        () => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? '']).filter(([, value]) => value !== '')),
        [searchParams],
    );
    const page = Number(searchParams.get('page')) || 1;
    const queryKey = searchParams.toString();

    const assignedView = isTeam && filters.assignee === 'me';
    useDocumentTitle(assignedView ? 'My assigned concerns' : isTeam ? 'Organization concerns' : 'My concerns');

    const list = useQuery(() => {
        const { sort, ...rest } = filters;
        const [field, direction] = (sort || 'created_at:desc').split(':');

        return concernsApi.list({ ...rest, sort: field, direction, page, per_page: PER_PAGE });
    }, [queryKey, organization.id]);

    const categories = useQuery(() => categoriesApi.list(), [organization.id]);
    const assignees = useQuery(() => (isTeam ? membersApi.assignable() : Promise.resolve([])), [organization.id, isTeam]);

    const updateFilters = useCallback(
        (changes) => {
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);

                    Object.entries(changes).forEach(([key, value]) => {
                        if (value) next.set(key, value);
                        else next.delete(key);
                    });
                    // Any change to the filters starts again from the first page.
                    next.delete('page');

                    return next;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const resetFilters = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

    const goToPage = useCallback(
        (target) => {
            setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (target > 1) next.set('page', String(target));
                else next.delete('page');

                return next;
            });
            window.scrollTo({ top: 0 });
        },
        [setSearchParams],
    );

    const concerns = list.data?.data ?? [];
    const meta = list.data?.meta;
    const hasFilters = Object.keys(filters).some((key) => key !== 'sort');

    return (
        <>
            <PageHeader
                eyebrow={organization.name}
                title={assignedView ? 'My assigned concerns' : isTeam ? 'Organization concerns' : 'My concerns'}
                description={
                    isTeam
                        ? 'Every concern raised in this workspace. Search, filter, and open one to act on it.'
                        : 'Everything you have submitted, with its current status.'
                }
                actions={
                    <>
                        <Button variant="secondary" icon={RefreshCw} onClick={list.reload} loading={list.refreshing} aria-label="Refresh list">
                            Refresh
                        </Button>
                        <Button to="/concerns/create" icon={Plus}>
                            Submit concern
                        </Button>
                    </>
                }
            />

            <ConcernFilters
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                categories={categories.data ?? []}
                assignees={assignees.data ?? []}
                isTeam={isTeam}
                currentUserId={user.id}
            />

            <div className="mt-6" aria-busy={list.loading || list.refreshing}>
                {list.loading ? (
                    <SkeletonRows rows={8} />
                ) : list.error && !list.data ? (
                    <ErrorState error={list.error} onRetry={list.reload} title="The concern list could not be loaded" />
                ) : concerns.length === 0 ? (
                    hasFilters ? (
                        <EmptyState
                            icon={SearchX}
                            title="No concerns match these filters"
                            action={
                                <Button variant="secondary" onClick={resetFilters}>
                                    Clear all filters
                                </Button>
                            }
                        >
                            Try a different search term, or remove a filter to widen the results.
                        </EmptyState>
                    ) : (
                        <EmptyState
                            icon={Inbox}
                            title={isTeam ? 'No concerns have been submitted yet' : 'You have not submitted any concerns yet'}
                            action={
                                <Button to="/concerns/create" icon={Plus}>
                                    Submit a concern
                                </Button>
                            }
                        >
                            {isTeam
                                ? 'When customers submit concerns they will appear here, ready to be reviewed and assigned.'
                                : 'Tell the team what you need help with. You can follow its progress here.'}
                        </EmptyState>
                    )
                ) : (
                    <>
                        {list.error && (
                            <p role="alert" className="mb-3 rounded-md bg-signal-50 px-3.5 py-2.5 text-sm text-signal-700">
                                The list could not be refreshed: {list.error.message}{' '}
                                <button type="button" onClick={list.reload} className="rounded font-medium underline underline-offset-2">
                                    Try again
                                </button>
                            </p>
                        )}
                        <div className={cx('transition-opacity', list.refreshing && 'opacity-60')}>
                            <ConcernTable concerns={concerns} isTeam={isTeam} onAssign={setAssigning} onDelete={setDeleting} />
                            <ConcernCards concerns={concerns} isTeam={isTeam} onAssign={setAssigning} onDelete={setDeleting} />
                        </div>
                        <div className="mt-6">
                            <Pagination meta={meta} onPageChange={goToPage} disabled={list.refreshing} noun="concern" />
                        </div>
                    </>
                )}
            </div>

            <AssignDialog concern={assigning} open={Boolean(assigning)} onClose={() => setAssigning(null)} onAssigned={() => list.reload()} />
            <DeleteConcernDialog
                concern={deleting}
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onDeleted={() => {
                    // Deleting the last row of a page would otherwise leave an empty page behind.
                    if (concerns.length === 1 && page > 1) goToPage(page - 1);
                    else list.reload();
                }}
            />
        </>
    );
}
