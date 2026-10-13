import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/features/auth/AuthContext';
import { cx } from '@/lib/format';

export const SITE_SECTIONS = [
    { id: 'product', label: 'Product' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'use-cases', label: 'Use cases' },
];

function useActiveSection(ids) {
    const [active, setActive] = useState(null);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(entry.target.id);
                });
            },
            { rootMargin: '-45% 0px -50% 0px' },
        );

        ids.map((id) => document.getElementById(id)).filter(Boolean).forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [ids]);

    return active;
}

const SECTION_IDS = SITE_SECTIONS.map((section) => section.id);

export function SiteHeader() {
    const { status } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const active = useActiveSection(SECTION_IDS);
    const signedIn = status === 'authenticated';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={cx(
                'sticky top-0 z-40 border-b bg-paper/95 backdrop-blur-sm transition-colors',
                scrolled || menuOpen ? 'border-line' : 'border-transparent',
            )}
        >
            <div className="mx-auto flex h-16 max-w-site items-center gap-8 px-5 sm:px-8">
                <Link to="/" className="rounded" aria-label="ResolveDesk home">
                    <Logo />
                </Link>

                <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
                    {SITE_SECTIONS.map((section) => (
                        <a
                            key={section.id}
                            href={`#${section.id}`}
                            aria-current={active === section.id ? 'location' : undefined}
                            className={cx(
                                'relative rounded px-3 py-2 text-sm transition-colors',
                                active === section.id ? 'font-medium text-ink-950' : 'text-muted hover:text-ink-950',
                            )}
                        >
                            {section.label}
                            <span
                                className={cx(
                                    'absolute inset-x-3 -bottom-[0.6875rem] h-0.5 bg-ink-950 transition-opacity',
                                    active === section.id ? 'opacity-100' : 'opacity-0',
                                )}
                                aria-hidden="true"
                            />
                        </a>
                    ))}
                </nav>

                <div className="ml-auto hidden items-center gap-2 md:flex">
                    {signedIn ? (
                        <Button to="/dashboard">Open dashboard</Button>
                    ) : (
                        <>
                            <Button to="/login" variant="ghost">
                                Sign in
                            </Button>
                            <Button to="/register">Get started</Button>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="-mr-2 ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-800 hover:bg-ink-950/[0.06] md:hidden"
                    aria-expanded={menuOpen}
                    aria-controls="site-menu"
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    onClick={() => setMenuOpen((value) => !value)}
                >
                    {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </button>
            </div>

            {menuOpen && (
                <div id="site-menu" className="animate-fade-in border-t border-line bg-paper px-5 pb-6 pt-2 md:hidden">
                    <nav aria-label="Primary" className="flex flex-col">
                        {SITE_SECTIONS.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                onClick={() => setMenuOpen(false)}
                                className="border-b border-line py-3.5 text-base text-ink-900"
                            >
                                {section.label}
                            </a>
                        ))}
                    </nav>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {signedIn ? (
                            <Button to="/dashboard" className="col-span-2">
                                Open dashboard
                            </Button>
                        ) : (
                            <>
                                <Button to="/login" variant="secondary">
                                    Sign in
                                </Button>
                                <Button to="/register">Get started</Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
