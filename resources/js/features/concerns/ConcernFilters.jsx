import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PRIORITIES, PRIORITY_LABELS, SORT_OPTIONS, STATUSES, STATUS_LABELS } from '@/lib/constants';
import { cx, formatDate } from '@/lib/format';

const STATUS_TABS = [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, ...STATUSES];

const PANEL_FILTERS = ['priority', 'category_id', 'assignee', 'created_from', 'created_to', 'overdue'];

function FilterLabel({ label, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
            {children}
        </label>
    );
}

export function ConcernFilters({ filters, onChange, onReset, categories, assignees, isTeam, currentUserId }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebouncedValue(search);
    const activePanelFilters = PANEL_FILTERS.filter((key) => filters[key]);
    const [panelOpen, setPanelOpen] = useState(activePanelFilters.length > 0);

    // Typing updates the URL after a pause, not on every keystroke.
    useEffect(() => {
        if (debouncedSearch !== (filters.search ?? '')) {
            onChange({ search: debouncedSearch });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    // Keep the box in step when the URL changes elsewhere (reset, back button).
    useEffect(() => {
        setSearch(filters.search ?? '');
    }, [filters.search]);

    const assigneeName = (value) => {
        if (value === 'me') return 'me';
        if (value === 'unassigned') return 'nobody';

        return assignees.find((person) => String(person.id) === value)?.name ?? 'selected member';
    };

    const chips = [
        filters.search && { key: 'search', label: `“${filters.search}”` },
        filters.priority && { key: 'priority', label: `${PRIORITY_LABELS[filters.priority]} priority` },
        filters.category_id && {
            key: 'category_id',
            label: categories.find((category) => String(category.id) === filters.category_id)?.name ?? 'Category',
        },
        isTeam && filters.assignee && { key: 'assignee', label: `Assigned to ${assigneeName(filters.assignee)}` },
        filters.created_from && { key: 'created_from', label: `From ${formatDate(`${filters.created_from}T00:00`)}` },
        filters.created_to && { key: 'created_to', label: `Until ${formatDate(`${filters.created_to}T00:00`)}` },
        filters.overdue && { key: 'overdue', label: 'Overdue only' },
    ].filter(Boolean);

    const hasAnyFilter = chips.length > 0 || Boolean(filters.status);

    return (
        <div>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <div role="tablist" aria-label="Filter by status" className="flex min-w-max gap-1 border-b border-line">
                    {STATUS_TABS.map((tab) => {
                        const selected = (filters.status ?? '') === tab.value;

                        return (
                            <button
                                key={tab.value || 'all'}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => onChange({ status: tab.value })}
                                className={cx(
                                    '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:ring-inset',
                                    selected ? 'border-ink-950 font-medium text-ink-950' : 'border-transparent text-muted hover:text-ink-950',
                                )}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by ticket or title"
                        aria-label="Search concerns by ticket or title"
                        maxLength={100}
                        className="pl-9"
                    />
                </div>

                <Select
                    aria-label="Sort concerns"
                    value={filters.sort || 'created_at:desc'}
                    onChange={(event) => onChange({ sort: event.target.value === 'created_at:desc' ? '' : event.target.value })}
                    className="w-44"
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>

                <Button
                    variant="secondary"
                    icon={SlidersHorizontal}
                    onClick={() => setPanelOpen((value) => !value)}
                    aria-expanded={panelOpen}
                    aria-controls="concern-filter-panel"
                >
                    Filters
                    {activePanelFilters.length > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-950 px-1.5 font-mono text-2xs text-paper">
                            {activePanelFilters.length}
                        </span>
                    )}
                </Button>
            </div>

            {panelOpen && (
                <div
                    id="concern-filter-panel"
                    className="mt-3 grid animate-fade-in gap-x-4 gap-y-4 rounded-lg border border-line bg-paper-100/60 p-4 sm:grid-cols-2 xl:grid-cols-5"
                >
                    <FilterLabel label="Priority">
                        <Select value={filters.priority ?? ''} onChange={(event) => onChange({ priority: event.target.value })}>
                            <option value="">Any priority</option>
                            {PRIORITIES.map((priority) => (
                                <option key={priority.value} value={priority.value}>
                                    {priority.label}
                                </option>
                            ))}
                        </Select>
                    </FilterLabel>

                    <FilterLabel label="Category">
                        <Select value={filters.category_id ?? ''} onChange={(event) => onChange({ category_id: event.target.value })}>
                            <option value="">Any category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>
                    </FilterLabel>

                    {isTeam && (
                        <FilterLabel label="Assigned to">
                            <Select value={filters.assignee ?? ''} onChange={(event) => onChange({ assignee: event.target.value })}>
                                <option value="">Anyone</option>
                                <option value="me">Me</option>
                                <option value="unassigned">Unassigned</option>
                                {assignees
                                    .filter((person) => person.id !== currentUserId)
                                    .map((person) => (
                                        <option key={person.id} value={person.id}>
                                            {person.name}
                                        </option>
                                    ))}
                            </Select>
                        </FilterLabel>
                    )}

                    <FilterLabel label="Submitted from">
                        <Input
                            type="date"
                            value={filters.created_from ?? ''}
                            max={filters.created_to || undefined}
                            onChange={(event) => onChange({ created_from: event.target.value })}
                        />
                    </FilterLabel>

                    <FilterLabel label="Submitted until">
                        <Input
                            type="date"
                            value={filters.created_to ?? ''}
                            min={filters.created_from || undefined}
                            onChange={(event) => onChange({ created_to: event.target.value })}
                        />
                    </FilterLabel>

                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-800 sm:col-span-2 xl:col-span-5">
                        <input
                            type="checkbox"
                            checked={Boolean(filters.overdue)}
                            onChange={(event) => onChange({ overdue: event.target.checked ? '1' : '' })}
                            className="h-4 w-4 rounded accent-ink-950"
                        />
                        Only show concerns past their target date
                    </label>
                </div>
            )}

            {hasAnyFilter && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {filters.status && (
                        <span className="text-[0.8125rem] text-muted">
                            Status: <span className="text-ink-900">{filters.status === 'active' ? 'Active' : STATUS_LABELS[filters.status]}</span>
                        </span>
                    )}
                    {chips.map((chip) => (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => onChange({ [chip.key]: '' })}
                            className="inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-white py-1 pl-3 pr-2 text-[0.8125rem] text-ink-800 transition-colors hover:border-ink-300"
                        >
                            {chip.label}
                            <X className="h-3.5 w-3.5 text-faint" aria-hidden="true" />
                            <span className="sr-only">Remove filter</span>
                        </button>
                    ))}
                    <button type="button" onClick={onReset} className="rounded px-1 text-[0.8125rem] font-medium text-jade-700 hover:text-jade-800">
                        Clear all filters
                    </button>
                </div>
            )}
        </div>
    );
}
