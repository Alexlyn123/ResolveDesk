export const STATUSES = [
    { value: 'open', label: 'Open', hint: 'Submitted and waiting for the team to pick it up.' },
    { value: 'under_review', label: 'Under review', hint: 'The team is assessing what is needed.' },
    { value: 'in_progress', label: 'In progress', hint: 'Someone is actively working on it.' },
    { value: 'waiting_for_customer', label: 'Waiting for customer', hint: 'The team needs information from the customer.' },
    { value: 'resolved', label: 'Resolved', hint: 'A resolution has been recorded.' },
    { value: 'closed', label: 'Closed', hint: 'Finished. No further changes.' },
];

export const STATUS_LABELS = Object.fromEntries(STATUSES.map((status) => [status.value, status.label]));

export const PRIORITIES = [
    { value: 'low', label: 'Low', rank: 1, hint: 'Can wait; no one is blocked.' },
    { value: 'medium', label: 'Medium', rank: 2, hint: 'Should be handled in the normal course of work.' },
    { value: 'high', label: 'High', rank: 3, hint: 'Causing real disruption.' },
    { value: 'urgent', label: 'Urgent', rank: 4, hint: 'Safety risk or a complete stop.' },
];

export const PRIORITY_LABELS = Object.fromEntries(PRIORITIES.map((priority) => [priority.value, priority.label]));

export const ROLE_LABELS = {
    customer: 'Customer',
    staff: 'Staff',
    admin: 'Administrator',
};

export const SORT_OPTIONS = [
    { value: 'created_at:desc', label: 'Newest first' },
    { value: 'created_at:asc', label: 'Oldest first' },
    { value: 'updated_at:desc', label: 'Recently updated' },
    { value: 'priority:desc', label: 'Highest priority' },
    { value: 'due_at:asc', label: 'Due soonest' },
];

export function transitionLabel(from, to, role) {
    switch (to) {
        case 'under_review':
            return 'Start review';
        case 'in_progress':
            if (from === 'waiting_for_customer') return 'Resume work';
            if (from === 'resolved' || from === 'closed') return 'Reopen';
            return 'Start work';
        case 'waiting_for_customer':
            return 'Request information';
        case 'resolved':
            return 'Mark resolved';
        case 'closed':
            if (from === 'resolved') return role === 'customer' ? 'Confirm and close' : 'Close concern';
            return 'Close without resolving';
        default:
            return STATUS_LABELS[to] ?? to;
    }
}
