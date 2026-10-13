import { useEffect, useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, FormError, SkeletonRows } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { cx, pluralize } from '@/lib/format';
import { categoriesApi } from '@/lib/services';

function CategoryDialog({ category, open, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(category?.id);
    const [values, setValues] = useState({ name: '', description: '' });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setValues({ name: category?.name ?? '', description: category?.description ?? '' });
            setErrors({});
            setFormError(null);
        }
    }, [open, category]);

    async function submit(event) {
        event.preventDefault();
        if (submitting) return;

        if (values.name.trim().length < 2) {
            setErrors({ name: 'Give the category a name.' });

            return;
        }

        const payload = { name: values.name.trim(), description: values.description.trim() || null };

        setSubmitting(true);
        setFormError(null);
        try {
            if (editing) await categoriesApi.update(category.id, payload);
            else await categoriesApi.create(payload);

            toast.success(editing ? 'Category updated.' : `“${payload.name}” was added.`);
            onSaved();
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
            title={editing ? 'Edit category' : 'New category'}
            size="sm"
            dismissible={!submitting}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" form="category-form" loading={submitting}>
                        {editing ? 'Save changes' : 'Add category'}
                    </Button>
                </>
            }
        >
            <form id="category-form" onSubmit={submit} noValidate className="space-y-4">
                <FormError>{formError}</FormError>
                <TextField
                    label="Name"
                    value={values.name}
                    onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                    error={errors.name}
                    maxLength={80}
                    required
                />
                <TextAreaField
                    label="Description"
                    value={values.description}
                    onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                    error={errors.description}
                    maxLength={255}
                    rows={3}
                    hint="Shown to administrators to explain what belongs here."
                    optional
                />
            </form>
        </Dialog>
    );
}

export function CategoriesPage() {
    const { organization } = useAuth();
    const toast = useToast();
    const { data: categories, error, loading, reload } = useQuery(() => categoriesApi.list({ include_inactive: 1 }), [organization.id]);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    useDocumentTitle('Categories');

    async function toggleActive(category) {
        setBusyId(category.id);
        try {
            await categoriesApi.update(category.id, { is_active: !category.is_active });
            toast.success(category.is_active ? `“${category.name}” was retired.` : `“${category.name}” is available again.`);
            await reload();
        } catch (failure) {
            toast.error(failure.message);
        } finally {
            setBusyId(null);
        }
    }

    async function confirmDelete() {
        setBusyId(deleting.id);
        setDeleteError(null);
        try {
            await categoriesApi.remove(deleting.id);
            toast.success(`“${deleting.name}” was deleted.`);
            setDeleting(null);
            await reload();
        } catch (failure) {
            setDeleteError(failure.message);
        } finally {
            setBusyId(null);
        }
    }

    return (
        <>
            <PageHeader
                eyebrow={organization.name}
                title="Categories"
                description="Categories route concerns to the right people and shape your reports. Retire one to stop new concerns using it; existing concerns keep it."
                actions={
                    <Button icon={Plus} onClick={() => setEditing({})}>
                        New category
                    </Button>
                }
            />

            {loading ? (
                <SkeletonRows rows={6} />
            ) : error && !categories ? (
                <ErrorState error={error} onRetry={reload} />
            ) : categories.length === 0 ? (
                <EmptyState
                    icon={Tags}
                    title="No categories yet"
                    action={
                        <Button icon={Plus} onClick={() => setEditing({})}>
                            Add the first category
                        </Button>
                    }
                >
                    Customers choose a category when they submit a concern, so at least one is needed.
                </EmptyState>
            ) : (
                <ul className="max-w-4xl divide-y divide-line border-y border-ink-950">
                    {categories.map((category) => (
                        <li key={category.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                            <div className="min-w-0 flex-1 basis-64">
                                <p className="flex flex-wrap items-center gap-2">
                                    <span className={cx('font-medium', category.is_active ? 'text-ink-950' : 'text-muted line-through decoration-ink-300')}>{category.name}</span>
                                    {!category.is_active && (
                                        <span className="rounded bg-paper-200 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-muted">Retired</span>
                                    )}
                                </p>
                                {category.description && <p className="mt-0.5 text-[0.8125rem] text-muted">{category.description}</p>}
                            </div>
                            <p className="w-28 font-mono text-xs tabular-nums text-muted">{pluralize(category.concerns_count ?? 0, 'concern')}</p>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => toggleActive(category)} loading={busyId === category.id && !deleting}>
                                    {category.is_active ? 'Retire' : 'Restore'}
                                </Button>
                                <IconButton icon={Pencil} label={`Edit ${category.name}`} onClick={() => setEditing(category)} />
                                <IconButton
                                    icon={Trash2}
                                    label={`Delete ${category.name}`}
                                    onClick={() => {
                                        setDeleteError(null);
                                        setDeleting(category);
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <CategoryDialog category={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={reload} />

            <ConfirmDialog
                open={Boolean(deleting)}
                onCancel={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete this category?"
                confirmLabel="Delete category"
                destructive
                loading={Boolean(deleting) && busyId === deleting.id}
                error={deleteError}
            >
                <p>
                    <span className="font-medium text-ink-950">{deleting?.name}</span> will be removed permanently.
                </p>
                <p>A category that concerns already use cannot be deleted; retire it instead so their records stay intact.</p>
            </ConfirmDialog>
        </>
    );
}
