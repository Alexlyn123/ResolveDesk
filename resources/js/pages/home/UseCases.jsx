import { useRef, useState } from 'react';
import { PriorityIndicator } from '@/components/ui/PriorityIndicator';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { cx } from '@/lib/format';
import { USE_CASES } from './sampleData';

export function UseCases() {
    const [activeKey, setActiveKey] = useState(USE_CASES[1].key);
    const tabRefs = useRef({});
    const active = USE_CASES.find((useCase) => useCase.key === activeKey);

    function onKeyDown(event) {
        const index = USE_CASES.findIndex((useCase) => useCase.key === activeKey);
        const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];

        if (!delta) return;

        event.preventDefault();
        const next = USE_CASES[(index + delta + USE_CASES.length) % USE_CASES.length];
        setActiveKey(next.key);
        tabRefs.current[next.key]?.focus();
    }

    return (
        <section id="use-cases" className="border-t border-line bg-paper-100 py-24 lg:py-32">
            <div className="mx-auto max-w-site px-5 sm:px-8">
                <div className="max-w-2xl">
                    <p className="eyebrow">Use cases</p>
                    <h2 className="display mt-4 text-[2rem] leading-[1.08] sm:text-[2.5rem]">
                        The same workflow, wherever people raise concerns.
                    </h2>
                </div>

                <div className="mt-12 grid gap-x-16 gap-y-8 lg:grid-cols-12">
                    <div
                        role="tablist"
                        aria-label="Use cases"
                        aria-orientation="vertical"
                        onKeyDown={onKeyDown}
                        className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-2 lg:col-span-4 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0"
                    >
                        {USE_CASES.map((useCase) => {
                            const selected = useCase.key === activeKey;

                            return (
                                <button
                                    key={useCase.key}
                                    ref={(element) => {
                                        tabRefs.current[useCase.key] = element;
                                    }}
                                    type="button"
                                    role="tab"
                                    id={`use-case-tab-${useCase.key}`}
                                    aria-selected={selected}
                                    aria-controls="use-case-panel"
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => setActiveKey(useCase.key)}
                                    className={cx(
                                        'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors',
                                        'lg:flex lg:w-full lg:items-center lg:justify-between lg:whitespace-normal lg:rounded-none lg:border-0 lg:border-t lg:px-0 lg:py-4 lg:text-left lg:text-lg',
                                        selected
                                            ? 'border-ink-950 bg-ink-950 text-paper lg:border-ink-950 lg:bg-transparent lg:font-medium lg:text-ink-950'
                                            : 'border-paper-300 text-muted hover:text-ink-950 lg:border-ink-950/15',
                                    )}
                                >
                                    {useCase.label}
                                    <span
                                        className={cx('hidden h-1.5 w-1.5 rounded-full bg-jade-600 lg:block', selected ? 'opacity-100' : 'opacity-0')}
                                        aria-hidden="true"
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div
                        key={active.key}
                        role="tabpanel"
                        id="use-case-panel"
                        aria-labelledby={`use-case-tab-${active.key}`}
                        tabIndex={0}
                        className="animate-fade-in rounded lg:col-span-8 lg:border-t lg:border-ink-950 lg:pt-6"
                    >
                        <p className="display max-w-2xl text-2xl leading-snug sm:text-[1.75rem]">{active.summary}</p>

                        <div className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Typical categories</h3>
                                <ul className="mt-3 divide-y divide-line border-y border-line text-sm text-ink-800">
                                    {active.categories.map((category) => (
                                        <li key={category} className="py-2">
                                            {category}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">An example concern</h3>
                                <div className="mt-3 rounded-lg border border-paper-300 bg-white px-4 py-4">
                                    <p className="ticket">{active.example.id}</p>
                                    <p className="mt-1 font-medium text-ink-950">{active.example.title}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
                                        <StatusIndicator status={active.example.status} />
                                        <PriorityIndicator priority={active.example.priority} />
                                        <span className="text-[0.8125rem] text-muted">{active.example.category}</span>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-faint">Sample data for illustration.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
