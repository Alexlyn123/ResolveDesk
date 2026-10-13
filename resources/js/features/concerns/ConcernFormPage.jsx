import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Field, Input, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { ErrorState, FormError, LoadingState } from '@/components/ui/States';
import { StatusGlyph } from '@/components/ui/StatusIndicator';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { PRIORITIES } from '@/lib/constants';
import { cx, toDateInputValue } from '@/lib/format';
import { categoriesApi, concernsApi } from '@/lib/services';

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;

export function validateConcern(values, { editableText = true } = {}) {
    const errors = {};

    if (editableText) {
        const title = values.title.trim();
        if (!title) errors.title = 'Give the concern a short title.';
        else if (title.length < 5) errors.title = 'Use at least 5 characters.';
        else if (title.length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`;

        const description = values.description.trim();
        if (!description) errors.description = 'Describe the concern.';
        else if (description.length < 10) errors.description = 'Add a little more detail (at least 10 characters).';
    }

    if (!values.category_id) errors.category_id = 'Choose a category.';

    return errors;
}

function PriorityPicker({ value, onChange, disabled }) {
    return (
        <fieldset disabled={disabled}>
            <legend className="mb-1.5 text-sm font-medium text-ink-900">Priority</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRIORITIES.map((priority) => {
                    const selected = value === priority.value;

                    return (
                        <label
                            key={priority.value}
                            className={cx(
                                'relative cursor-pointer rounded-md border px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-jade-600 focus-within:ring-offset-2 focus-within:ring-offset-paper',
                                selected ? 'border-ink-950 bg-white shadow-[inset_0_0_0_1px_#0B1322]' : 'border-paper-300 bg-white hover:border-ink-300',
                                disabled && 'cursor-not-allowed opacity-60',
                            )}
                        >
                            <input
                                type="radio"
                                name="priority"
                                value={priority.value}
                                checked={selected}
                                onChange={() => onChange(priority.value)}
                                className="sr-only"
                            />
                            <PriorityIndicator priority={priority.value} className="font-medium text-ink-950" />
                            <span className="mt-1 block text-xs leading-snug text-muted">{priority.hint}</span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}

function WhatHappensNext({ isTeam }) {
    const steps = isTeam
        ? [
              ['open', 'Logged as Open', 'The concern is recorded under your name with a new reference.'],
              ['under_review', 'Review and assign', 'Assign it to the right person and set a target date.'],
              ['resolved', 'Resolve on the record', 'A resolution note is required before it can be marked resolved.'],
          ]
        : [
              ['open', 'You get a reference', 'Your concern is saved as Open and the team is notified.'],
              ['under_review', 'The team reviews it', 'Someone is assigned and may ask you for more detail.'],
              ['resolved', 'You see the outcome', 'Updates and the final resolution appear on the concern page.'],
          ];

    return (
        <aside className="lg:sticky lg:top-24" aria-label="What happens next">
            <h2 className="border-b border-ink-950 pb-2.5 text-[0.9375rem] font-semibold text-ink-950">What happens next</h2>
            <ol className="mt-4 space-y-5">
                {steps.map(([status, title, body]) => (
                    <li key={status} className="flex gap-3">
                        <StatusGlyph
                            status={status}
                            className={cx('mt-0.5', status === 'resolved' ? 'text-jade-600' : status === 'under_review' ? 'text-steel-600' : 'text-ink-500')}
                        />
                        <div>
                            <p className="text-sm font-medium text-ink-950">{title}</p>
                            <p className="mt-0.5 text-[0.8125rem] text-muted">{body}</p>
                        </div>
                    </li>
                ))}
            </ol>
            {!isTeam && (
                <p className="mt-6 border-t border-line pt-4 text-[0.8125rem] text-muted">
                    You can edit or withdraw a concern while it is still Open. Avoid including passwords or payment card numbers.
                </p>
            )}
        </aside>
    );
}

export function ConcernFormPage() {
    const { id } = useParams();
    const editing = Boolean(id);
    const { user, organization, isTeam, isAdmin } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [values, setValues] = useState({ title: '', description: '', category_id: '', priority: 'medium', due_at: '' });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useDocumentTitle(editing ? 'Edit concern' : 'Submit a concern');

    const categories = useQuery(() => categoriesApi.list(), [organization.id]);
    const existing = useQuery(() => (editing ? concernsApi.get(id) : Promise.resolve(null)), [id]);
    const concern = existing.data;

    useEffect(() => {
        if (concern) {
            setValues({
                title: concern.title,
                description: concern.description ?? '',
                category_id: String(concern.category?.id ?? ''),
                priority: concern.priority,
                due_at: concern.due_on ?? '',
            });
        }
    }, [concern]);

    // Mirrors the server's rules: wording belongs to the submitter (or an administrator).
    const editableText = !editing || concern?.creator?.id === user.id || isAdmin;
    const set = (field) => (eventOrValue) => {
        const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    async function onSubmit(event) {
        event.preventDefault();
        if (submitting) return;

        const clientErrors = validateConcern(values, { editableText });
        setErrors(clientErrors);
        setFormError(null);

        if (Object.keys(clientErrors).length > 0) {
            setFormError('Please check the highlighted fields.');

            return;
        }

        // Only fields this person may set are sent. Ownership, workspace, and status are decided by the server.
        const payload = {
            category_id: Number(values.category_id),
            priority: values.priority,
            ...(editableText && { title: values.title.trim(), description: values.description.trim() }),
            ...(isTeam && { due_at: values.due_at || null }),
        };

        setSubmitting(true);
        try {
            const saved = editing ? await concernsApi.update(id, payload) : await concernsApi.create(payload);
            toast.success(editing ? 'Your changes were saved.' : `Concern ${saved.reference} was submitted.`);
            navigate(`/concerns/${saved.id}`, { replace: editing });
        } catch (error) {
            if (error.isValidation) {
                setErrors(error.errors);
                setFormError('Please check the highlighted fields.');
            } else {
                setFormError(error.message);
            }
            setSubmitting(false);
        }
    }

    if (editing && existing.loading) return <LoadingState label="Loading concern" />;
    if (editing && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />;

    if (editing && concern && !concern.permissions.update) {
        return (
            <ErrorState
                error={{ status: 403, message: 'This concern is already being handled, or belongs to someone else, and can no longer be edited.' }}
                title="This concern cannot be edited"
            />
        );
    }

    const categoryOptions = categories.data ?? [];
    // A concern may keep a category that has since been retired.
    const currentCategoryMissing = concern?.category && !categoryOptions.some((category) => category.id === concern.category.id);

    return (
        <>
            <PageHeader
                back={editing ? { to: `/concerns/${id}`, label: concern.reference } : { to: '/concerns', label: 'Concerns' }}
                eyebrow={editing ? concern.reference : organization.name}
                title={editing ? 'Edit concern' : 'Submit a concern'}
                description={
                    editing
                        ? 'Changes are recorded in the concern’s history.'
                        : 'Describe what is wrong and what you need. The clearer the detail, the faster it can be resolved.'
                }
            />

            <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
                    <FormError>{formError}</FormError>

                    <TextField
                        label="Title"
                        name="title"
                        value={values.title}
                        onChange={set('title')}
                        error={errors.title}
                        maxLength={TITLE_MAX}
                        placeholder="A one-line summary, for example: Water leaking under the kitchen sink"
                        hint={editableText ? undefined : 'Only the person who submitted this concern can change its wording.'}
                        disabled={!editableText}
                        required
                        autoFocus={!editing}
                    />

                    {categories.error ? (
                        <FormError>
                            Categories could not be loaded.{' '}
                            <button type="button" className="rounded font-medium underline underline-offset-2" onClick={categories.reload}>
                                Try again
                            </button>
                        </FormError>
                    ) : (
                        <SelectField
                            label="Category"
                            name="category_id"
                            value={values.category_id}
                            onChange={set('category_id')}
                            error={errors.category_id}
                            disabled={categories.loading}
                            hint="Helps route the concern to the right people."
                            required
                        >
                            <option value="">{categories.loading ? 'Loading categories…' : 'Choose a category'}</option>
                            {currentCategoryMissing && <option value={concern.category.id}>{concern.category.name} (retired)</option>}
                            {categoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </SelectField>
                    )}

                    <div>
                        <TextAreaField
                            label="Description"
                            name="description"
                            value={values.description}
                            onChange={set('description')}
                            error={errors.description}
                            maxLength={DESCRIPTION_MAX}
                            rows={8}
                            placeholder="What happened, where, and since when? What have you already tried?"
                            disabled={!editableText}
                            required
                        />
                        <p className="mt-1 text-right font-mono text-2xs tabular-nums text-faint" aria-hidden="true">
                            {values.description.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
                        </p>
                    </div>

                    <div>
                        <PriorityPicker value={values.priority} onChange={set('priority')} />
                        {errors.priority && <p className="mt-1.5 text-[0.8125rem] text-signal-700">{errors.priority}</p>}
                        {!isTeam && <p className="mt-2 text-[0.8125rem] text-muted">This is your suggestion. The team may adjust it after review.</p>}
                    </div>

                    {isTeam && (
                        <Field label="Target date" error={errors.due_at} hint="When this should be resolved by. Concerns past this date are flagged as overdue." optional>
                            {(control) => (
                                <Input
                                    {...control}
                                    type="date"
                                    name="due_at"
                                    value={values.due_at}
                                    onChange={set('due_at')}
                                    min={editing ? undefined : toDateInputValue(new Date())}
                                    className="max-w-[14rem]"
                                />
                            )}
                        </Field>
                    )}

                    <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
                        <Button type="submit" size="lg" loading={submitting}>
                            {editing ? (submitting ? 'Saving' : 'Save changes') : submitting ? 'Submitting' : 'Submit concern'}
                        </Button>
                        <Button variant="ghost" size="lg" to={editing ? `/concerns/${id}` : '/concerns'}>
                            Cancel
                        </Button>
                    </div>
                </form>

                {!editing && <WhatHappensNext isTeam={isTeam} />}
            </div>
        </>
    );
}
