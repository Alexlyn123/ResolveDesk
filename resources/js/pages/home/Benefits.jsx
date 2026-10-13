import { ArrowRight, Mail, MessageSquare, Phone, Sheet } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusGlyph } from '@/components/ui/StatusIndicator';

function IntakeFigure() {
    const channels = [
        { icon: Mail, label: 'Email' },
        { icon: MessageSquare, label: 'Chat' },
        { icon: Phone, label: 'Phone' },
        { icon: Sheet, label: 'Sheets' },
    ];

    return (
        <div className="flex items-center gap-2.5" aria-hidden="true">
            <ul className="grid shrink-0 grid-cols-2 gap-1.5">
                {channels.map((channel) => (
                    <li
                        key={channel.label}
                        title={channel.label}
                        className="flex h-7 w-7 items-center justify-center rounded border border-dashed border-paper-300 text-faint"
                    >
                        <channel.icon className="h-3.5 w-3.5" />
                    </li>
                ))}
            </ul>
            <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
            <div className="rounded-md border border-ink-950 bg-white px-3 py-2">
                <p className="whitespace-nowrap font-mono text-2xs text-ink-500">RD-2026-000184</p>
                <p className="text-xs font-medium text-ink-950">One queue</p>
            </div>
        </div>
    );
}

function OwnershipFigure() {
    return (
        <div className="space-y-2 text-xs" aria-hidden="true">
            <div className="flex items-center justify-between rounded-md border border-dashed border-paper-300 px-3 py-2 text-faint">
                <span>Assigned to</span>
                <span className="italic">Unassigned</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-ink-950 bg-white px-3 py-2">
                <span className="text-muted">Assigned to</span>
                <span className="flex items-center gap-2 font-medium text-ink-950">
                    <Avatar name="Daniel Okafor" size="sm" />
                    Daniel Okafor
                </span>
            </div>
            <p className="pl-3 font-mono text-2xs text-faint">Target: Thu 16 Oct</p>
        </div>
    );
}

function TraceFigure() {
    const steps = [
        ['open', 'Submitted', '09:12'],
        ['in_progress', 'Plumber booked', '13:05'],
        ['resolved', 'Joint replaced, tested', '18:22'],
    ];

    return (
        <ol className="space-y-2.5 text-xs" aria-hidden="true">
            {steps.map(([status, text, time]) => (
                <li key={status} className="flex items-center gap-2.5">
                    <StatusGlyph
                        status={status}
                        className={status === 'resolved' ? 'text-jade-600' : status === 'in_progress' ? 'text-steel-600' : 'text-ink-500'}
                    />
                    <span className="flex-1 text-ink-800">{text}</span>
                    <span className="font-mono text-2xs text-faint">{time}</span>
                </li>
            ))}
        </ol>
    );
}

const BENEFITS = [
    {
        title: 'Centralized intake',
        body: 'Every concern enters through one form and receives a reference the moment it is submitted. Nothing depends on someone remembering to forward a message or update a sheet.',
        figure: IntakeFigure,
    },
    {
        title: 'Clear ownership',
        body: 'A concern is either unassigned and visible to the whole team, or it has one named person responsible for it. Target dates make the overdue ones impossible to miss.',
        figure: OwnershipFigure,
    },
    {
        title: 'Traceable resolution',
        body: 'Each status change, reply, and reassignment is recorded with who did it and when. A concern cannot be marked resolved without saying how it was resolved.',
        figure: TraceFigure,
    },
];

export function Benefits() {
    return (
        <section id="product" className="bg-paper-100 pb-24 pt-44 sm:pt-52 lg:pb-32">
            <div className="mx-auto grid max-w-site gap-x-16 gap-y-12 px-5 sm:px-8 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <div className="lg:sticky lg:top-28">
                        <p className="eyebrow">The problem</p>
                        <h2 className="display mt-4 text-[2rem] leading-[1.08] sm:text-[2.5rem]">
                            Concerns are rarely ignored. They are <em className="italic">misplaced.</em>
                        </h2>
                        <p className="mt-5 text-muted">
                            A complaint arrives in a group chat. A repair request sits in someone&rsquo;s inbox. A follow-up lives in a
                            spreadsheet only one person opens. Nobody decided to drop them; there was simply no single place where they
                            had to be.
                        </p>
                        <p className="mt-4 text-muted">ResolveDesk gives every concern that place, an owner, and a record.</p>
                    </div>
                </div>

                <ol className="lg:col-span-8">
                    {BENEFITS.map((benefit, index) => (
                        <li
                            key={benefit.title}
                            className="grid gap-x-8 gap-y-6 border-t border-ink-950/15 py-9 first:border-ink-950 sm:grid-cols-[2.5rem_1fr] xl:grid-cols-[2.5rem_1fr_17rem]"
                        >
                            <span className="font-mono text-xs text-faint">0{index + 1}</span>
                            <div>
                                <h3 className="display text-2xl">{benefit.title}</h3>
                                <p className="mt-2.5 max-w-prose text-muted">{benefit.body}</p>
                            </div>
                            <div className="self-center sm:col-start-2 xl:col-start-3">
                                <benefit.figure />
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
