import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { ErrorState, FormError, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useQuery } from '@/hooks/useQuery';
import { organizationsApi } from '@/lib/services';

export function OrganizationSettingsPage() {
    const { organization, refresh } = useAuth();
    const toast = useToast();
    const { data, error, loading, reload, setData } = useQuery(() => organizationsApi.get(organization.id), [organization.id]);

    const [values, setValues] = useState({ name: '', description: '' });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [confirmRegenerate, setConfirmRegenerate] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [regenerateError, setRegenerateError] = useState(null);

    useDocumentTitle('Organization settings');

    useEffect(() => {
        if (data) setValues({ name: data.name, description: data.description ?? '' });
    }, [data]);

    const dirty = data && (values.name !== data.name || values.description !== (data.description ?? ''));

    async function save(event) {
        event.preventDefault();
        if (saving) return;

        if (values.name.trim().length < 2) {
            setErrors({ name: 'Enter the organization’s name.' });

            return;
        }

        setSaving(true);
        setFormError(null);
        setErrors({});
        try {
            setData(await organizationsApi.update(organization.id, { name: values.name.trim(), description: values.description.trim() || null }));
            // The workspace name is shown in the sidebar, which reads from the session.
            await refresh();
            toast.success('Organization settings saved.');
        } catch (failure) {
            if (failure.isValidation) setErrors(failure.errors);
            else setFormError(failure.message);
        } finally {
            setSaving(false);
        }
    }

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(data.join_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('The code could not be copied. Select it and copy it manually.');
        }
    }

    async function regenerate() {
        setRegenerating(true);
        setRegenerateError(null);
        try {
            setData(await organizationsApi.regenerateJoinCode(organization.id));
            setConfirmRegenerate(false);
            toast.success('A new workspace code was generated.');
        } catch (failure) {
            setRegenerateError(failure.message);
        } finally {
            setRegenerating(false);
        }
    }

    if (loading) return <LoadingState label="Loading settings" />;
    if (error && !data) return <ErrorState error={error} onRetry={reload} />;

    return (
        <>
            <PageHeader eyebrow={organization.name} title="Organization settings" description="How your workspace is named, and how customers join it." />

            <div className="max-w-2xl space-y-12">
                <Section title="Profile">
                    <form onSubmit={save} noValidate className="space-y-5 pt-4">
                        <FormError>{formError}</FormError>
                        <TextField
                            label="Organization name"
                            value={values.name}
                            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                            error={errors.name}
                            maxLength={120}
                            required
                        />
                        <TextAreaField
                            label="Description"
                            value={values.description}
                            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                            error={errors.description}
                            maxLength={1000}
                            rows={3}
                            optional
                        />
                        <Button type="submit" loading={saving} disabled={!dirty}>
                            Save changes
                        </Button>
                    </form>
                </Section>

                <Section title="Workspace code" description="Share this with customers. Anyone who registers or joins with it becomes a customer of this workspace, never staff.">
                    <div className="flex flex-wrap items-center gap-3 pt-4">
                        <code className="select-all rounded-md border border-paper-300 bg-white px-4 py-2.5 font-mono text-base tracking-[0.12em] text-ink-950">
                            {data.join_code}
                        </code>
                        <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyCode}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                        <Button variant="ghost" icon={RefreshCw} onClick={() => setConfirmRegenerate(true)}>
                            Generate a new code
                        </Button>
                    </div>
                    <p className="mt-3 text-[0.8125rem] text-muted" aria-live="polite">
                        {copied ? 'Workspace code copied to the clipboard.' : 'Generating a new code stops the old one from working. Existing members are not affected.'}
                    </p>
                </Section>
            </div>

            <ConfirmDialog
                open={confirmRegenerate}
                onCancel={() => setConfirmRegenerate(false)}
                onConfirm={regenerate}
                title="Generate a new workspace code?"
                confirmLabel="Generate new code"
                loading={regenerating}
                error={regenerateError}
            >
                <p>The current code stops working immediately. Anyone you have already shared it with will need the new one to join.</p>
            </ConfirmDialog>
        </>
    );
}
