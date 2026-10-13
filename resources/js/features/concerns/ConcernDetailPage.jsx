import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, CircleCheck, Ellipsis, Hourglass, Pencil, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { Person } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/hooks/useQuery';
import { transitionLabel } from '@/lib/constants';
import { cx, formatDateTime, formatDay, formatRelative } from '@/lib/format';
import { concernsApi } from '@/lib/services';
import { ActivityTimeline } from './ActivityTimeline';
import { AssignDialog, DeleteConcernDialog, StatusDialog } from './ConcernDialogs';
import { Discussion } from './Discussion';

function Detail({ label, children }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-[0.8125rem] text-muted">{label}</dt>
            <dd className="min-w-0 text-right text-[0.8125rem] text-ink-900">{children}</dd>
        </div>
    );
}

function Actions({ concern, role, accepting, onAccept, onTransition, onAssign, onDelete }) {
    const [primary, ...others] = concern.transitions ?? [];
    const { permissions } = concern;
    // Staff can take an unowned concern in one step.
    const canAccept = role !== 'customer' && permissions.assign && !concern.assignee && concern.status !== 'closed' && concern.status !== 'resolved';

    const overflow = [
        permissions.update && { label: 'Edit details', icon: Pencil, to: `/concerns/${concern.id}/edit` },
        permissions.delete && { label: role === 'customer' ? 'Withdraw concern' : 'Delete concern', icon: Trash2, danger: true, onSelect: onDelete },
    ].filter(Boolean);

    if (!primary && !permissions.assign && overflow.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {canAccept && (
                <Button variant="accent" icon={UserCheck} loading={accepting} onClick={onAccept}>
                    Accept concern
                </Button>
            )}

            {primary && (
                <Button variant={primary.status === 'resolved' ? 'accent' : canAccept ? 'secondary' : 'primary'} onClick={() => onTransition(primary)}>
                    {transitionLabel(concern.status, primary.status, role)}
                </Button>
            )}

            {others.length > 0 && (
                <Dropdown
                    label="Other status changes"
                    items={others.map((transition) => ({
                        label: transitionLabel(concern.status, transition.status, role),
                        onSelect: () => onTransition(transition),
                    }))}
                    trigger={
                        <Button variant="secondary">
                            More
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    }
                />
            )}

            {permissions.assign && (
                <Button variant="secondary" icon={UserPlus} onClick={onAssign}>
                    {concern.assignee ? 'Reassign' : 'Assign'}
                </Button>
            )}

            {overflow.length > 0 && (
                <Dropdown label="More actions" items={overflow} trigger={<IconButton icon={Ellipsis} label="More actions" className="border border-paper-300 bg-white" />} />
            )}
        </div>
    );
}

export function ConcernDetailPage() {
    const { id } = useParams();
    const { user, role, isTeam, isCustomer } = useAuth();
    const toast = useToast();
    const [accepting, setAccepting] = useState(false);
    const navigate = useNavigate();
    const composerRef = useRef(null);
    const { data: concern, error, loading, reload, setData } = useQuery(() => concernsApi.get(id), [id]);

    const [transition, setTransition] = useState(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    useDocumentTitle(concern ? `${concern.reference} · ${concern.title}` : 'Concern');

    async function accept() {
        setAccepting(true);
        try {
            let updated = await concernsApi.assign(concern.id, user.id);
            if (updated.status === 'open' && updated.transitions?.some((item) => item.status === 'under_review')) {
                updated = await concernsApi.changeStatus(concern.id, 'under_review');
            }
            setData(updated);
            toast.success(`You accepted ${updated.reference}.`);
        } catch (failure) {
            toast.error(failure.message);
            reload();
        } finally {
            setAccepting(false);
        }
    }

    if (loading) return <LoadingState label="Loading concern" />;

    if (error && !concern) {
        return (
            <>
                <ErrorState
                    error={error}
                    onRetry={reload}
                    title={error.status === 404 ? 'This concern does not exist' : error.status === 403 ? 'You do not have access to this concern' : undefined}
                />
                <p className="text-center">
                    <Button variant="secondary" to="/concerns">
                        Back to concerns
                    </Button>
                </p>
            </>
        );
    }

    const waiting = concern.status === 'waiting_for_customer';
    const lastRequest = waiting ? [...concern.status_history].reverse().find((entry) => entry.new_status === 'waiting_for_customer') : null;
    const finished = concern.status === 'resolved' || concern.status === 'closed';

    return (
        <article>
            <header className="mb-8 border-b border-line pb-6">
                <Link to="/concerns" className="-ml-1 mb-4 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm text-muted transition-colors hover:text-ink-950">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Concerns
                </Link>

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="ticket text-[0.8125rem]">{concern.reference}</span>
                    <span className="text-[0.8125rem] text-muted">{concern.category?.name}</span>
                </p>
                <h1 className="display mt-2 max-w-4xl text-[1.875rem] leading-[1.12] sm:text-[2.5rem]">{concern.title}</h1>

                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <StatusIndicator status={concern.status} size="lg" />
                        <PriorityIndicator priority={concern.priority} />
                        {concern.is_overdue && (
                            <span className="rounded bg-signal-50 px-2 py-0.5 text-xs font-medium text-signal-700">
                                Overdue since {formatDay(concern.due_on)}
                            </span>
                        )}
                    </div>
                    <Actions
                        concern={concern}
                        role={role}
                        accepting={accepting}
                        onAccept={accept}
                        onTransition={setTransition}
                        onAssign={() => setAssignOpen(true)}
                        onDelete={() => setDeleteOpen(true)}
                    />
                </div>
            </header>

            <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0 space-y-10">
                    {waiting && (
                        <div className="flex gap-3 border-l-2 border-amber-600 bg-amber-50 px-4 py-3.5">
                            <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-amber-800">
                                    {isCustomer ? 'The team needs more information from you' : 'Waiting for the customer to reply'}
                                </p>
                                {lastRequest?.note && <p className="mt-1 whitespace-pre-line text-sm text-ink-900">{lastRequest.note}</p>}
                                {isCustomer && concern.permissions.comment && (
                                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => composerRef.current?.focus()}>
                                        Write a reply
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {finished && concern.resolution_note && (
                        <section aria-labelledby="resolution-title" className="border-l-2 border-jade-600 bg-jade-50 px-4 py-4">
                            <h2 id="resolution-title" className="flex items-center gap-2 text-sm font-semibold text-jade-800">
                                <CircleCheck className="h-4 w-4" aria-hidden="true" />
                                Resolution
                            </h2>
                            <p className="mt-2 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-ink-900">{concern.resolution_note}</p>
                            <p className="mt-2 text-xs text-muted">Recorded {formatDateTime(concern.resolved_at)}</p>
                        </section>
                    )}

                    <section aria-labelledby="description-title">
                        <h2 id="description-title" className="border-b border-ink-950 pb-2.5 text-[0.9375rem] font-semibold text-ink-950">
                            Description
                        </h2>
                        <p className="mt-4 max-w-prose whitespace-pre-line break-words text-base leading-relaxed text-ink-800">{concern.description}</p>
                    </section>

                    <Discussion ref={composerRef} concern={concern} onPosted={reload} />
                </div>

                <aside className="space-y-10">
                    <section aria-labelledby="details-title">
                        <h2 id="details-title" className="border-b border-ink-950 pb-2.5 text-[0.9375rem] font-semibold text-ink-950">
                            Details
                        </h2>
                        <dl className="divide-y divide-line">
                            <Detail label="Assigned to">
                                <Person person={concern.assignee} className="justify-end" />
                            </Detail>
                            <Detail label="Submitted by">
                                <span className="block">{concern.creator?.name}</span>
                                {isTeam && concern.creator?.email && (
                                    <a href={`mailto:${concern.creator.email}`} className="block truncate rounded text-xs text-muted underline-offset-2 hover:underline">
                                        {concern.creator.email}
                                    </a>
                                )}
                            </Detail>
                            <Detail label="Category">{concern.category?.name}</Detail>
                            <Detail label="Target date">
                                {concern.due_on ? (
                                    <span className={cx(concern.is_overdue && 'font-medium text-signal-700')}>{formatDay(concern.due_on)}</span>
                                ) : (
                                    <span className="italic text-faint">Not set</span>
                                )}
                            </Detail>
                            <Detail label="Submitted">
                                <time dateTime={concern.created_at}>{formatDateTime(concern.created_at)}</time>
                            </Detail>
                            <Detail label="Last updated">
                                <time dateTime={concern.updated_at} title={formatDateTime(concern.updated_at)}>
                                    {formatRelative(concern.updated_at)}
                                </time>
                            </Detail>
                            {concern.closed_at && (
                                <Detail label="Closed">
                                    <time dateTime={concern.closed_at}>{formatDateTime(concern.closed_at)}</time>
                                </Detail>
                            )}
                        </dl>
                    </section>

                    <section aria-labelledby="history-title">
                        <h2 id="history-title" className="mb-4 border-b border-ink-950 pb-2.5 text-[0.9375rem] font-semibold text-ink-950">
                            History
                        </h2>
                        <ActivityTimeline concern={concern} />
                    </section>
                </aside>
            </div>

            <StatusDialog
                concern={concern}
                transition={transition}
                open={Boolean(transition)}
                onClose={() => setTransition(null)}
                onChanged={setData}
            />
            <AssignDialog concern={concern} open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={setData} />
            <DeleteConcernDialog concern={concern} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={() => navigate('/concerns', { replace: true })} />
        </article>
    );
}
