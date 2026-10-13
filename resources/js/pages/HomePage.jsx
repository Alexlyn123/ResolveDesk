import { ArrowDown, ArrowRight } from 'lucide-react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Benefits } from './home/Benefits';
import { HowItWorks } from './home/HowItWorks';
import { ProductPreview } from './home/ProductPreview';
import { UseCases } from './home/UseCases';
import { WorkflowPreview } from './home/WorkflowPreview';

function Hero() {
    const { status } = useAuth();
    const signedIn = status === 'authenticated';

    return (
        <section className="relative">
            <div className="mx-auto max-w-site px-5 sm:px-8">
                <div className="flex items-center justify-between gap-6 border-b border-ink-950/15 pb-3 pt-8 sm:pt-12">
                    <p className="eyebrow">Customer concern management</p>
                    <p className="eyebrow hidden sm:block">Intake · Ownership · Resolution</p>
                </div>

                <div className="grid gap-x-12 gap-y-8 pt-10 sm:pt-14 lg:grid-cols-12 lg:items-end">
                    <h1 className="display text-[2.75rem] leading-[0.98] sm:text-7xl lg:col-span-8 lg:text-[5.5rem]">
                        Every concern deserves a <em className="italic text-jade-700">clear resolution.</em>
                    </h1>

                    <div className="lg:col-span-4 lg:pb-3">
                        <p className="text-lg leading-relaxed text-ink-700">
                            Bring customer requests, team responsibilities, and resolution updates into one accountable workflow.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            {signedIn ? (
                                <Button to="/dashboard" size="lg">
                                    Open your dashboard
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            ) : (
                                <Button to="/register" size="lg">
                                    Get started
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            )}
                            <a
                                href="#how-it-works"
                                className="inline-flex h-12 items-center gap-2 rounded-md px-3 text-[0.9375rem] font-medium text-ink-800 underline decoration-ink-300 decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink-950"
                            >
                                See how it works
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto -mb-28 mt-14 max-w-site px-5 sm:mt-20 sm:px-8">
                <ProductPreview />
            </div>
        </section>
    );
}

function ClosingCall() {
    const { status } = useAuth();

    return (
        <section className="border-t border-line py-20 lg:py-28">
            <div className="mx-auto grid max-w-site gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:items-end">
                <h2 className="display text-[2.25rem] leading-[1.05] sm:text-6xl lg:col-span-8">
                    Start with the next concern. <span className="text-ink-400">Keep the record of every one after it.</span>
                </h2>
                <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end lg:pb-2">
                    {status === 'authenticated' ? (
                        <Button to="/dashboard" size="lg">
                            Open your dashboard
                        </Button>
                    ) : (
                        <>
                            <Button to="/register" size="lg">
                                Create an account
                            </Button>
                            <Button to="/login" size="lg" variant="secondary">
                                Sign in
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

export function HomePage() {
    useDocumentTitle('Every concern deserves a clear resolution');

    return (
        <div className="min-h-screen">
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
            >
                Skip to content
            </a>
            <SiteHeader />
            <main id="content">
                <Hero />
                <Benefits />
                <HowItWorks />
                <WorkflowPreview />
                <UseCases />
                <ClosingCall />
            </main>
            <SiteFooter />
        </div>
    );
}
