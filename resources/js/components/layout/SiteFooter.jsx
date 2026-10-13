import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { SITE_SECTIONS } from './SiteHeader';

export function SiteFooter() {
    const linkClass = 'rounded text-sm text-ink-300 transition-colors hover:text-paper';

    return (
        <footer className="on-dark bg-ink-950 text-ink-300">
            <div className="mx-auto grid max-w-site gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                    <Logo tone="dark" />
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
                        A customer concern management platform. Receive, assign, track, and resolve every request in one accountable workflow.
                    </p>
                </div>

                <nav aria-label="Product">
                    <h2 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">Product</h2>
                    <ul className="mt-4 space-y-2.5">
                        {SITE_SECTIONS.map((section) => (
                            <li key={section.id}>
                                <a href={`/#${section.id}`} className={linkClass}>
                                    {section.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav aria-label="Account">
                    <h2 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">Account</h2>
                    <ul className="mt-4 space-y-2.5">
                        <li>
                            <Link to="/login" className={linkClass}>
                                Sign in
                            </Link>
                        </li>
                        <li>
                            <Link to="/register" className={linkClass}>
                                Create an account
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
