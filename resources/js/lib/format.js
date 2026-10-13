const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
    const date = toDate(value);

    return date ? dateFormat.format(date) : '—';
}

export function formatShortDate(value) {
    const date = toDate(value);

    return date ? shortDateFormat.format(date) : '—';
}

export function formatDay(day, { short = false } = {}) {
    if (!day) return '—';

    return short ? formatShortDate(`${day}T00:00`) : formatDate(`${day}T00:00`);
}

export function formatDateTime(value) {
    const date = toDate(value);

    return date ? dateTimeFormat.format(date) : '—';
}

const UNITS = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
];

export function formatRelative(value, now = new Date()) {
    const date = toDate(value);
    if (!date) return '—';

    const seconds = Math.round((date.getTime() - now.getTime()) / 1000);

    if (Math.abs(seconds) < 45) return 'just now';

    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) {
            return relativeFormat.format(Math.round(seconds / size), unit);
        }
    }

    return relativeFormat.format(Math.round(seconds / 60), 'minute');
}

export function toDateInputValue(value) {
    const date = toDate(value);
    if (!date) return '';

    const pad = (number) => String(number).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function initials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function pluralize(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

export function cx(...values) {
    return values.filter(Boolean).join(' ');
}
