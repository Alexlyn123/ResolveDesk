import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ellipsis, Search, ShieldCheck, UserMinus, UserPlus, UserRound, Users, Wrench } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input, Select, SelectField, TextField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, FormError, SkeletonRows } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { ROLE_LABELS } from '@/lib/constants';
import { cx, formatDate } from '@/lib/format';
import { membersApi } from '@/lib/services';

const ROLE_HINTS = {
    customer: 'Submits concerns and follows their own.',
    staff: 'Reviews, is assigned, and resolves concerns.',
    admin: 'Everything staff can do, plus team, categories, and settings.',
};

function AddMemberDialog({ open, onClose, onAdded }) {
    const toast = useToast();
    const [values, setValues] = useState({ email: '', role: 'staff' });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValues({ email: '', role: 'staff' });
            setErrors({});
            setFormError(null);
        }
    }, [open]);

    async function submit(event) {
        event.preventDefault();
        if (submitting) return;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
            setErrors({ email: 'Enter a valid email address.' });

            return;
        }

        setSubmitting(true);
        setFormError(null);
        try {
            const member = await membersApi.add({ email: values.email.trim(), role: values.role });
            toast.success(`${member.user.name} was added as ${ROLE_LABELS[member.role].toLowerCase()}.`);
            onAdded();
            onClose();
        } catch (error) {
            if (error.isValidation) setErrors(error.errors);
            else setFormError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Add a team member"
            description="Add someone who already has a ResolveDesk account. Customers can also join by themselves with your workspace code."
            size="sm"
            dismissible={!submitting}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="member-form" loading={submitting}>
                        Add member
                    </Button>
                </>
            }
        >
            <form id="member-form" onSubmit={submit} noValidate className="space-y-4">
                <FormError>{formError}</FormError>
                <TextField
                    label="Email address"
                    type="email"
                    value={values.email}
                    onChange={(event) => {
                        setValues((current) => ({ ...current, email: event.target.value }));
                        setErrors({});
                    }}
                    error={errors.email}
                    required
                />
                <SelectField
                    label="Role"
                    value={values.role}
                    onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))}
                    error={errors.role}
                    hint={ROLE_HINTS[values.role]}
                >
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                    <option value="customer">Customer</option>
                </SelectField>
            </form>
        </Dialog>
    );
}

export function TeamPage() {
    const { organization } = useAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const role = searchParams.get('role') ?? '';
    const page = Number(searchParams.get('page')) || 1;
    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const debouncedSearch = useDebouncedValue(search);

    const [addOpen, setAddOpen] = useState(false);
    const [pending, setPending] = useState(null); // { member, action, payload, title, body, confirmLabel, destructive }
    const [working, setWorking] = useState(false);
    const [actionError, setActionError] = useState(null);

    useDocumentTitle('Team management');

    useEffect(() => {
        if (debouncedSearch !== (searchParams.get('search') ?? '')) {
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    if (debouncedSearch) next.set('search', debouncedSearch);
                    else next.delete('search');
                    next.delete('page');

                    return next;
                },
                { replace: true },
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const list = useQuery(
        () => membersApi.list({ search: searchParams.get('search'), role, page, per_page: 20 }),
        [searchParams.toString(), organization.id],
    );

    const members = list.data?.data ?? [];

    function setParam(key, value) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (value) next.set(key, value);
            else next.delete(key);
            if (key !== 'page') next.delete('page');

            return next;
        });
    }

    function ask(member, change) {
        setActionError(null);
        setPending({ member, ...change });
    }

    async function confirmPending() {
        setWorking(true);
        setActionError(null);
        try {
            if (pending.action === 'remove') await membersApi.remove(pending.member.id);
            else await membersApi.update(pending.member.id, pending.payload);

            toast.success(pending.success);
            setPending(null);
            await list.reload();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setWorking(false);
        }
    }

    function actionsFor(member) {
        const name = member.user.name;
        const suspended = member.status === 'suspended';

        const roleChanges = ['customer', 'staff', 'admin']
            .filter((target) => target !== member.role)
            .map((target) => ({
                label: `Make ${ROLE_LABELS[target].toLowerCase()}`,
                icon: target === 'admin' ? ShieldCheck : target === 'staff' ? Wrench : UserRound,
                onSelect: () =>
                    ask(member, {
                        action: 'update',
                        payload: { role: target },
                        title: `Make ${name} ${target === 'admin' ? 'an administrator' : target === 'staff' ? 'a staff member' : 'a customer'}?`,
                        body:
                            target === 'customer'
                                ? `${name} will lose access to other people’s concerns. Active concerns assigned to them return to the unassigned queue.`
                                : ROLE_HINTS[target],
                        confirmLabel: 'Change role',
                        success: `${name} is now ${ROLE_LABELS[target].toLowerCase()}.`,
                    }),
            }));

        return [
            ...roleChanges,
            'divider',
            suspended
                ? {
                      label: 'Restore access',
                      icon: UserPlus,
                      onSelect: () =>
                          ask(member, {
                              action: 'update',
                              payload: { status: 'active' },
                              title: `Restore ${name}’s access?`,
                              body: `${name} will be able to sign in to this workspace again.`,
                              confirmLabel: 'Restore access',
                              success: `${name}’s access was restored.`,
                          }),
                  }
                : {
                      label: 'Suspend access',
                      icon: UserMinus,
                      danger: true,
                      onSelect: () =>
                          ask(member, {
                              action: 'update',
                              payload: { status: 'suspended' },
                              title: `Suspend ${name}?`,
                              body: `${name} will no longer be able to open this workspace. Active concerns assigned to them return to the unassigned queue. Their history is kept.`,
                              confirmLabel: 'Suspend access',
                              destructive: true,
                              success: `${name} was suspended.`,
                          }),
                  },
            {
                label: 'Remove from workspace',
                icon: UserMinus,
                danger: true,
                onSelect: () =>
                    ask(member, {
                        action: 'remove',
                        title: `Remove ${name} from the workspace?`,
                        body: `${name} loses all access to ${organization.name}. Concerns and comments they wrote stay on record.`,
                        confirmLabel: 'Remove member',
                        destructive: true,
                        success: `${name} was removed.`,
                    }),
            },
        ];
    }

    return (
        <>
            <PageHeader
                eyebrow={organization.name}
                title="Team management"
                description="Decide who can handle concerns and who administers the workspace. Roles apply to this workspace only."
                actions={
                    <Button icon={UserPlus} onClick={() => setAddOpen(true)}>
                        Add member
                    </Button>
                }
            />

            <div className="mb-5 flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1 basis-56 sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name or email"
                        aria-label="Search members by name or email"
                        className="pl-9"
                    />
                </div>
                <Select aria-label="Filter by role" value={role} onChange={(event) => setParam('role', event.target.value)} className="w-44">
                    <option value="">All roles</option>
                    <option value="admin">Administrators</option>
                    <option value="staff">Staff</option>
                    <option value="customer">Customers</option>
                </Select>
            </div>

            {list.loading ? (
                <SkeletonRows rows={6} />
            ) : list.error && !list.data ? (
                <ErrorState error={list.error} onRetry={list.reload} />
            ) : members.length === 0 ? (
                <EmptyState icon={Users} title="No members match">
                    Try a different name, or clear the role filter.
                </EmptyState>
            ) : (
                <>
                    <ul className={cx('divide-y divide-line border-y border-ink-950 transition-opacity', list.refreshing && 'opacity-60')}>
                        {members.map((member) => (
                            <li key={member.id} className="flex items-center gap-3 py-3.5">
                                <Avatar name={member.user.name} />
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-ink-950">
                                        <span className="truncate">{member.user.name}</span>
                                        {member.is_self && <span className="text-xs font-normal text-faint">you</span>}
                                        {member.status === 'suspended' && (
                                            <span className="rounded bg-signal-50 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-signal-700">Suspended</span>
                                        )}
                                    </p>
                                    <p className="truncate text-[0.8125rem] text-muted">{member.user.email}</p>
                                </div>
                                <p className="hidden w-32 text-xs text-faint md:block">Joined {formatDate(member.joined_at)}</p>
                                <p
                                    className={cx(
                                        'w-28 text-right text-[0.8125rem] sm:text-left',
                                        member.role === 'customer' ? 'text-muted' : 'font-medium text-ink-950',
                                    )}
                                >
                                    {ROLE_LABELS[member.role]}
                                </p>
                                {member.is_self ? (
                                    <span className="w-9" aria-hidden="true" />
                                ) : (
                                    <Dropdown
                                        label={`Manage ${member.user.name}`}
                                        items={actionsFor(member)}
                                        trigger={<IconButton icon={Ellipsis} label={`Manage ${member.user.name}`} />}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6">
                        <Pagination meta={list.data.meta} onPageChange={(target) => setParam('page', target > 1 ? String(target) : '')} disabled={list.refreshing} noun="member" />
                    </div>
                </>
            )}

            <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={list.reload} />

            <ConfirmDialog
                open={Boolean(pending)}
                onCancel={() => setPending(null)}
                onConfirm={confirmPending}
                title={pending?.title ?? ''}
                confirmLabel={pending?.confirmLabel}
                destructive={pending?.destructive}
                loading={working}
                error={actionError}
            >
                <p>{pending?.body}</p>
            </ConfirmDialog>
        </>
    );
}
