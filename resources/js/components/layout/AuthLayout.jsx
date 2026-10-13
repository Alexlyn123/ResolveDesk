import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { ResolutionTrail } from '@/pages/home/ProductPreview';
import { SAMPLE_CONCERNS } from '@/pages/home/sampleData';

const SAMPLE = SAMPLE_CONCERNS.find((concern) => concern.status === 'resolved');

export function AuthLayout({ title, lead, children, footer }) {
    return (
        <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
                <Link to="/" className="self-start rounded" aria-label="ResolveDesk home">
                    <Logo />
                </Link>

                <main className="flex flex-1 items-center py-12">
                    <div className="mx-auto w-full max-w-[25rem]">
                        <h1 className="display text-[2.25rem] leading-[1.08] sm:text-[2.75rem]">{title}</h1>
                        {lead && <p className="mt-3 text-muted">{lead}</p>}
                        <div className="mt-8">{children}</div>
                        {footer && <p className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</p>}
                    </div>
                </main>
            </div>

            <aside className="on-dark hidden flex-col justify-between bg-ink-950 px-14 py-14 text-paper lg:flex xl:px-20" aria-label="About ResolveDesk">
                <div>
                    <p className="eyebrow text-ink-400">One accountable workflow</p>
                    <p className="display mt-6 max-w-md text-[2.5rem] leading-[1.1] text-paper">
                        Received, owned, and resolved <em className="italic text-jade-300">on the record.</em>
                    </p>
                </div>

                <figure className="max-w-md">
                    <div className="border-t border-white/15 pt-6">
                        <p className="font-mono text-2xs text-ink-400">{SAMPLE.id}</p>
                        <p className="mt-1 text-[0.9375rem] font-medium text-paper">{SAMPLE.title}</p>
                        <ResolutionTrail trail={SAMPLE.trail} className="mt-5" />
                    </div>
                    <figcaption className="mt-6 font-mono text-2xs uppercase tracking-[0.14em] text-ink-500">
                        Product preview · sample data
                    </figcaption>
                </figure>
            </aside>
        </div>
    );
}
