import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { SelectField, TextAreaField } from '@/components/ui/Field';
import { FormError, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { STATUS_LABELS, transitionLabel } from '@/lib/constants';
import { concernsApi, membersApi } from '@/lib/services';

export function AssignDialog({ concern, open, onClose, onAssigned }) {
    const { user } = useAuth();
    const toast = useToast();
    const [people, setPeople] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [selected, setSelected] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;

        setSelected(concern.assignee?.id ? String(concern.assignee.id) : '');
        setError(null);
        setLoadError(null);
        setPeople(null);

        let cancelled = false;
        membersApi.assignable().then(
            (data) => !cancelled && setPeople(data),
            (failure) => !cancelled && setLoadError(failure.message),
        );

        return () => {
            cancelled = true;
        };
    }, [open, concern]);

    const unchanged = selected === (concern?.assignee?.id ? String(concern.assignee.id) : '');

    async function submit(event) {
        event.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        setError(null);
        try {
            const updated = await concernsApi.assign(concern.id, selected ? Number(selected) : null);
            toast.success(updated.assignee ? `Assigned to ${updated.assignee.name}.` : 'Returned to the unassigned queue.');
            onAssigned(updated);
            onClose();
        } catch (failure) {
            setError(failure.errors?.assigned_to ?? failure.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (!concern) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Assign concern"
            description={`${concern.reference} · ${concern.title}`}
            size="sm"
            dismissible={!submitting}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="assign-form" loading={submitting} disabled={!people || unchanged}>
                        Save assignment
                    </Button>
                </>
            }
        >
            {loadError ? (
                <FormError>{loadError}</FormError>
            ) : !people ? (
                <LoadingState label="Loading team" className="py-6" />
            ) : (
                <form id="assign-form" onSubmit={submit} className="space-y-3">
                    <FormError>{error}</FormError>
                    <SelectField
                        label="Responsible team member"
                        value={selected}
                        onChange={(event) => setSelected(event.target.value)}
                        hint="They are notified and become accountable for the next step."
                    >
                        <option value="">Unassigned</option>
                        {people.map((person) => (
                            <option key={person.id} value={person.id}>
                                {person.name}
                                {person.id === user.id ? ' (you)' : ''}
                            </option>
                        ))}
                    </SelectField>
                    {selected !== String(user.id) && people.some((person) => person.id === user.id) && (
                        <button
                            type="button"
                            onClick={() => setSelected(String(user.id))}
                            className="rounded text-sm font-medium text-jade-700 hover:text-jade-800"
                        >
                            Assign to me
                        </button>
                    )}
                </form>
            )}
        </Dialog>
    );
}

const NOTE_COPY = {
    resolution: {
        label: 'Resolution note',
        hint: 'Describe what was done. The customer will see this, and it becomes part of the permanent record.',
        placeholder: 'What was found, what was done, and how it was confirmed.',
        min: 10,
        tooShort: 'Describe how the concern was resolved (at least 10 characters).',
    },
    waiting: {
        label: 'What do you need from the customer?',
        hint: 'The customer is notified. Their reply returns the concern to In progress automatically.',
        placeholder: 'Ask a specific question they can answer.',
        min: 5,
        tooShort: 'Tell the customer what information you need.',
    },
    note: {
        label: 'Reason',
        hint: 'Recorded in the history and visible to the customer.',
        placeholder: 'Why is this change being made?',
        min: 5,
        tooShort: 'Add a short note explaining this change.',
    },
    optional: {
        label: 'Note',
        hint: 'Optional. Recorded in the history and visible to the customer.',
        placeholder: '',
        min: 0,
    },
};

function noteCopyFor(transition) {
    if (transition.requires === 'resolution') return NOTE_COPY.resolution;
    if (transition.status === 'waiting_for_customer') return NOTE_COPY.waiting;
    if (transition.requires === 'note') return NOTE_COPY.note;

    return NOTE_COPY.optional;
}

export function StatusDialog({ concern, transition, open, onClose, onChanged }) {
    const { role } = useAuth();
    const toast = useToast();
    const [note, setNote] = useState('');
    const [fieldError, setFieldError] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setNote('');
            setFieldError(null);
            setError(null);
        }
    }, [open, transition?.status]);

    if (!concern || !transition) return null;

    const copy = noteCopyFor(transition);
    const action = transitionLabel(concern.status, transition.status, role);

    async function submit(event) {
        event.preventDefault();
        if (submitting) return;

        if (note.trim().length < copy.min) {
            setFieldError(copy.tooShort);

            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const updated = await concernsApi.changeStatus(concern.id, transition.status, note.trim());
            toast.success(`${concern.reference} is now ${STATUS_LABELS[updated.status].toLowerCase()}.`);
            onChanged(updated);
            onClose();
        } catch (failure) {
            if (failure.errors?.note) setFieldError(failure.errors.note);
            else setError(failure.errors?.status ?? failure.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={action}
            description={`${STATUS_LABELS[concern.status]} → ${STATUS_LABELS[transition.status]}`}
            dismissible={!submitting}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="status-form" variant={transition.status === 'resolved' ? 'accent' : 'primary'} loading={submitting}>
                        {action}
                    </Button>
                </>
            }
        >
            <form id="status-form" onSubmit={submit} noValidate className="space-y-3">
                <FormError>{error}</FormError>
                <TextAreaField
                    label={copy.label}
                    hint={copy.hint}
                    placeholder={copy.placeholder}
                    value={note}
                    onChange={(event) => {
                        setNote(event.target.value);
                        setFieldError(null);
                    }}
                    error={fieldError}
                    required={copy.min > 0}
                    optional={copy.min === 0}
                    maxLength={2000}
                    rows={copy.min > 0 ? 5 : 3}
                />
            </form>
        </Dialog>
    );
}

export function DeleteConcernDialog({ concern, open, onClose, onDeleted }) {
    const { isCustomer } = useAuth();
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) setError(null);
    }, [open]);

    if (!concern) return null;

    async function confirm() {
        setSubmitting(true);
        setError(null);
        try {
            await concernsApi.remove(concern.id);
            toast.success(`${concern.reference} was ${isCustomer ? 'withdrawn' : 'deleted'}.`);
            onClose();
            onDeleted(concern);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <ConfirmDialog
            open={open}
            onCancel={onClose}
            onConfirm={confirm}
            title={isCustomer ? 'Withdraw this concern?' : 'Delete this concern?'}
            confirmLabel={isCustomer ? 'Withdraw concern' : 'Delete concern'}
            cancelLabel="Keep it"
            destructive
            loading={submitting}
            error={error}
        >
            <p>
                <span className="ticket">{concern.reference}</span> · <span className="font-medium text-ink-950">{concern.title}</span>
            </p>
            <p>
                {isCustomer
                    ? 'It will be removed from your list and the team will no longer act on it.'
                    : 'It will be removed from every list. Its history is retained for audit purposes, and the deletion itself is recorded.'}
            </p>
        </ConfirmDialog>
    );
}
