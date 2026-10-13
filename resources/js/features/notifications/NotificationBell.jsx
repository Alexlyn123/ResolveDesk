import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useQuery } from '@/hooks/useQuery';
import { cx, formatRelative } from '@/lib/format';
import { notificationsApi, organizationsApi } from '@/lib/services';

const POLL_INTERVAL = 60_000;

export function NotificationBell() {
    const { organization, applySession } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const { data, error, reload, setData } = useQuery(() => notificationsApi.list(), []);

    const notifications = data?.data ?? [];
    const unread = data?.meta?.unread_count ?? 0;

    useEffect(() => {
        const timer = setInterval(() => document.visibilityState === 'visible' && reload(), POLL_INTERVAL);

        return () => clearInterval(timer);
    }, [reload]);

    useEffect(() => {
        if (!open) return undefined;

        reload();

        function onPointerDown(event) {
            if (!containerRef.current?.contains(event.target)) setOpen(false);
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') setOpen(false);
        }

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, reload]);

    async function openNotification(notification) {
        setOpen(false);

        if (!notification.read_at) {
            setData((current) => ({
                data: current.data.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)),
                meta: { unread_count: Math.max(0, current.meta.unread_count - 1) },
            }));
            notificationsApi.read(notification.id).catch(() => reload());
        }

        try {
            // A notification may belong to another of the user's workspaces.
            if (notification.data.organization_id !== organization?.id) {
                applySession(await organizationsApi.switchTo(notification.data.organization_id));
            }
            navigate(`/concerns/${notification.data.concern_id}`);
        } catch {
            navigate('/concerns');
        }
    }

    async function markAllRead() {
        setData((current) => ({
            data: current.data.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
            meta: { unread_count: 0 },
        }));
        notificationsApi.readAll().catch(() => reload());
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-haspopup="true"
                aria-expanded={open}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-ink-950/[0.06] hover:text-ink-950"
            >
                <Bell className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
                {unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal-600 px-1 font-mono text-[0.625rem] font-medium leading-none text-white ring-2 ring-paper">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-fade-in overflow-hidden rounded-lg border border-line bg-white shadow-xl shadow-ink-950/10">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <h2 className="text-sm font-semibold text-ink-950">Notifications</h2>
                        {unread > 0 && (
                            <button type="button" onClick={markAllRead} className="rounded text-xs font-medium text-jade-700 hover:text-jade-800">
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {error && !data ? (
                        <p className="px-4 py-8 text-center text-sm text-muted">Notifications could not be loaded.</p>
                    ) : notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted">Nothing new. Updates on your concerns appear here.</p>
                    ) : (
                        <ul className="max-h-[24rem] divide-y divide-line overflow-y-auto">
                            {notifications.map((notification) => (
                                <li key={notification.id}>
                                    <button
                                        type="button"
                                        onClick={() => openNotification(notification)}
                                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-100 focus-visible:bg-paper-100 focus-visible:ring-inset"
                                    >
                                        <span
                                            className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', notification.read_at ? 'bg-transparent' : 'bg-jade-500')}
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm leading-snug text-ink-900">
                                                {!notification.read_at && <span className="sr-only">Unread. </span>}
                                                {notification.data.message}
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs text-muted">{notification.data.title}</span>
                                            <span className="mt-1 flex items-center gap-2 text-2xs text-faint">
                                                <span className="ticket text-2xs">{notification.data.reference}</span>
                                                <span aria-hidden="true">·</span>
                                                {formatRelative(notification.created_at)}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
