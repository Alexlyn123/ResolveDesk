import { forwardRef, useState } from 'react';
import { Lock, MessageSquare, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cx, formatDateTime, formatRelative } from '@/lib/format';
import { concernsApi } from '@/lib/services';

function Comment({ comment }) {
    const internal = comment.visibility === 'internal';

    return (
        <li className={cx('flex gap-3 py-4', internal && '-mx-3 rounded-md bg-amber-50 px-3')}>
            <Avatar name={comment.author?.name ?? '?'} className="mt-0.5" />
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-medium text-ink-950">{comment.author?.name ?? 'Former member'}</span>
                    {comment.is_own && <span className="text-xs text-faint">you</span>}
                    {internal && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Internal note · not visible to the customer
                        </span>
                    )}
                    <time dateTime={comment.created_at} title={formatDateTime(comment.created_at)} className="text-xs text-faint">
                        {formatRelative(comment.created_at)}
                    </time>
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-ink-800">{comment.body}</p>
            </div>
        </li>
    );
}

const Composer = forwardRef(function Composer({ concern, onPosted }, ref) {
    const toast = useToast();
    const canPostInternally = concern.permissions.comment_internally;
    const [body, setBody] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const internal = visibility === 'internal';

    async function submit(event) {
        event.preventDefault();
        if (submitting) return;

        if (body.trim().length < 2) {
            setError('Write a message before posting.');

            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await concernsApi.addComment(concern.id, body.trim(), visibility);
            setBody('');
            toast.success(internal ? 'Internal note saved.' : 'Your message was posted.');
            onPosted();
        } catch (failure) {
            setError(failure.errors?.body ?? failure.errors?.visibility ?? failure.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="mt-4 border-t border-line pt-5">
            {canPostInternally && (
                <div role="radiogroup" aria-label="Who can see this" className="mb-3 inline-flex rounded-md border border-paper-300 bg-white p-0.5 text-sm">
                    {[
                        ['public', 'Reply to customer', MessageSquare],
                        ['internal', 'Internal note', Lock],
                    ].map(([value, label, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={visibility === value}
                            onClick={() => setVisibility(value)}
                            className={cx(
                                'inline-flex items-center gap-1.5 rounded px-3 py-1.5 transition-colors',
                                visibility === value
                                    ? value === 'internal'
                                        ? 'bg-amber-100 font-medium text-amber-800'
                                        : 'bg-ink-950 font-medium text-paper'
                                    : 'text-muted hover:text-ink-950',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <label htmlFor="comment-body" className="sr-only">
                {internal ? 'Internal note' : 'Message'}
            </label>
            <Textarea
                ref={ref}
                id="comment-body"
                value={body}
                onChange={(event) => {
                    setBody(event.target.value);
                    setError(null);
                }}
                rows={4}
                maxLength={4000}
                placeholder={
                    internal
                        ? 'A note for the team. The customer will never see this.'
                        : canPostInternally
                          ? 'Write an update for the customer…'
                          : 'Add a message or answer a question from the team…'
                }
                className={internal ? 'border-amber-300 bg-amber-50/50' : undefined}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'comment-error' : undefined}
            />
            <FormError className="mt-2">{error && <span id="comment-error">{error}</span>}</FormError>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                    {internal
                        ? 'Visible to staff and administrators only.'
                        : canPostInternally
                          ? 'The customer is notified and can read this.'
                          : 'The team handling your concern is notified.'}
                </p>
                <Button type="submit" icon={Send} loading={submitting} variant={internal ? 'secondary' : 'primary'}>
                    {internal ? 'Save note' : 'Post message'}
                </Button>
            </div>
        </form>
    );
});

export const Discussion = forwardRef(function Discussion({ concern, onPosted }, composerRef) {
    const comments = concern.comments ?? [];

    return (
        <section aria-labelledby="discussion-title">
            <div className="flex items-baseline justify-between border-b border-ink-950 pb-2.5">
                <h2 id="discussion-title" className="text-[0.9375rem] font-semibold text-ink-950">
                    Discussion
                </h2>
                <p className="text-xs text-faint">
                    {comments.length} {comments.length === 1 ? 'message' : 'messages'}
                </p>
            </div>

            {comments.length === 0 ? (
                <p className="py-6 text-sm text-muted">No messages yet. Updates between you and {concern.permissions.comment_internally ? 'the customer' : 'the team'} appear here.</p>
            ) : (
                <ul className="divide-y divide-line">
                    {comments.map((comment) => (
                        <Comment key={comment.id} comment={comment} />
                    ))}
                </ul>
            )}

            {concern.permissions.comment ? (
                <Composer ref={composerRef} concern={concern} onPosted={onPosted} />
            ) : (
                <p className="mt-2 border-t border-line pt-4 text-sm text-muted">This concern is closed. No further messages can be added.</p>
            )}
        </section>
    );
});
