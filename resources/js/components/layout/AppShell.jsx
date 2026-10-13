import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, Plus, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/Logo';
import { LoadingState } from '@/components/ui/States';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { Sidebar } from './Sidebar';

export function AppShell() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setDrawerOpen(false);
    }, [location.pathname, location.search]);

    useEffect(() => {
        if (!drawerOpen) return undefined;

        const onKeyDown = (event) => event.key === 'Escape' && setDrawerOpen(false);
        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [drawerOpen]);

    return (
        <div className="min-h-screen lg:pl-64">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
            >
                Skip to content
            </a>

            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
                <Sidebar />
            </aside>

            {drawerOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
                    <div className="absolute inset-0 animate-fade-in bg-ink-950/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
                    <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] animate-fade-in shadow-2xl">
                        <Sidebar onNavigate={() => setDrawerOpen(false)} />
                        <IconButton
                            icon={X}
                            label="Close navigation"
                            tone="dark"
                            onClick={() => setDrawerOpen(false)}
                            className="on-dark absolute right-2 top-4"
                        />
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-paper/95 px-4 backdrop-blur-sm sm:px-6 lg:px-10">
                <IconButton icon={Menu} label="Open navigation" onClick={() => setDrawerOpen(true)} className="-ml-2 lg:hidden" />
                <Link to="/dashboard" className="rounded text-ink-950 lg:hidden" aria-label="ResolveDesk overview">
                    <BrandMark className="h-6 w-6" />
                </Link>

                <div className="ml-auto flex items-center gap-1.5">
                    <NotificationBell />
                    {location.pathname !== '/concerns/create' && (
                        <Button to="/concerns/create" size="sm" icon={Plus} className="ml-1">
                            <span className="hidden sm:inline">Submit concern</span>
                            <span className="sm:hidden">New</span>
                        </Button>
                    )}
                </div>
            </header>

            <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[82rem] px-4 pb-20 pt-8 outline-none sm:px-6 lg:px-10 lg:pt-10">
                <Suspense fallback={<LoadingState className="min-h-[50vh]" />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
}
