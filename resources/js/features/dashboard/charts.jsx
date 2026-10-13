import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cx, formatShortDate } from '@/lib/format';

/** @param {{ items: Array<{key: string|number, label: React.ReactNode, name: string, value: number, to?: string, secondary?: string}>, unit?: string }} props */
export function BarList({ items, unit = 'concern', labelWidth = '9.5rem', empty = 'No data yet.' }) {
    const max = Math.max(1, ...items.map((item) => item.value));
    // Leave room for the caption so it is never clipped.
    const hasSecondary = items.some((item) => item.secondary);

    if (items.length === 0) {
        return <p className="py-6 text-sm text-muted">{empty}</p>;
    }

    return (
        <ul className="divide-y divide-line">
            {items.map((item) => {
                const Row = item.to ? Link : 'div';
                const plural = item.value === 1 ? unit : `${unit}s`;

                return (
                    <li key={item.key}>
                        <Row
                            {...(item.to ? { to: item.to } : {})}
                            title={`${item.name}: ${item.value} ${plural}`}
                            className={cx(
                                'group -mx-2 grid items-center gap-x-3 rounded px-2 py-2.5',
                                item.to && 'transition-colors hover:bg-ink-950/[0.035]',
                            )}
                            style={{ gridTemplateColumns: `${labelWidth} minmax(0, 1fr)` }}
                        >
                            <span className="min-w-0 truncate text-[0.8125rem] text-ink-800">{item.label}</span>
                            <span className="flex items-center gap-2">
                                <span
                                    className="h-2 rounded-r-[4px] bg-ink-700 transition-[width] duration-300 group-hover:bg-ink-950"
                                    style={{ width: item.value === 0 ? 0 : `max(3px, ${(item.value / max) * (hasSecondary ? 58 : 82)}%)` }}
                                    aria-hidden="true"
                                />
                                <span className="font-mono text-xs tabular-nums text-ink-900">{item.value}</span>
                                {item.secondary && <span className="shrink-0 whitespace-nowrap text-xs text-faint">{item.secondary}</span>}
                            </span>
                        </Row>
                    </li>
                );
            })}
        </ul>
    );
}

// Validated as a colour-blind-safe pair against the ivory surface.
const SERIES = [
    { key: 'created', label: 'Submitted', color: '#2F5597' },
    { key: 'resolved', label: 'Resolved', color: '#12A08A' },
];

const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, bottom: 26, left: 30 };

function niceMax(value) {
    if (value <= 4) return 4;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value / 4) * magnitude;

    return Math.ceil(value / step) * step;
}

function useWidth(ref, fallback = 640) {
    const [width, setWidth] = useState(fallback);

    useEffect(() => {
        if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
        observer.observe(ref.current);

        return () => observer.disconnect();
    }, [ref]);

    return width;
}

export function TrendChart({ series }) {
    const containerRef = useRef(null);
    const width = useWidth(containerRef);
    const [active, setActive] = useState(null);
    const [asTable, setAsTable] = useState(false);

    const { x, y, yTicks, xTicks, paths } = useMemo(() => {
        const innerWidth = width - MARGIN.left - MARGIN.right;
        const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
        const top = niceMax(Math.max(0, ...series.flatMap((point) => [point.created, point.resolved])));
        const xScale = (index) => MARGIN.left + (series.length <= 1 ? innerWidth / 2 : (index / (series.length - 1)) * innerWidth);
        const yScale = (value) => MARGIN.top + innerHeight - (value / top) * innerHeight;
        const every = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(innerWidth / 90))));

        return {
            x: xScale,
            y: yScale,
            yTicks: [0, top / 2, top],
            xTicks: series.map((point, index) => ({ point, index })).filter(({ index }) => index % every === 0),
            paths: SERIES.map((item) => ({
                ...item,
                d: series.map((point, index) => `${index === 0 ? 'M' : 'L'}${xScale(index).toFixed(1)},${yScale(point[item.key]).toFixed(1)}`).join(' '),
            })),
        };
    }, [series, width]);

    function onPointerMove(event) {
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - bounds.left - MARGIN.left) / (width - MARGIN.left - MARGIN.right);
        setActive(Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1)))));
    }

    function onKeyDown(event) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const delta = event.key === 'ArrowRight' ? 1 : -1;
            setActive((current) => Math.max(0, Math.min(series.length - 1, (current ?? (delta > 0 ? -1 : series.length)) + delta)));
        } else if (event.key === 'Escape') {
            setActive(null);
        }
    }

    const point = active !== null ? series[active] : null;
    const tooltipLeft = point ? Math.min(Math.max(x(active), 76), width - 76) : 0;

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <ul className="flex items-center gap-5" aria-label="Legend">
                    {SERIES.map((item) => (
                        <li key={item.key} className="flex items-center gap-2 text-[0.8125rem] text-ink-800">
                            <span className="h-0.5 w-4 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                            {item.label}
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    onClick={() => setAsTable((value) => !value)}
                    aria-pressed={asTable}
                    className="rounded text-[0.8125rem] font-medium text-ink-700 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-950"
                >
                    {asTable ? 'Show chart' : 'Show as table'}
                </button>
            </div>

            {asTable ? (
                <div className="max-h-72 overflow-y-auto border-y border-line">
                    <table className="w-full text-left text-[0.8125rem]">
                        <thead className="sticky top-0 bg-paper">
                            <tr className="border-b border-line text-muted">
                                <th scope="col" className="py-2 font-medium">
                                    Date
                                </th>
                                <th scope="col" className="py-2 text-right font-medium">
                                    Submitted
                                </th>
                                <th scope="col" className="py-2 text-right font-medium">
                                    Resolved
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {series.map((row) => (
                                <tr key={row.date}>
                                    <th scope="row" className="py-1.5 font-normal text-ink-800">
                                        {formatShortDate(`${row.date}T00:00`)}
                                    </th>
                                    <td className="py-1.5 text-right font-mono tabular-nums">{row.created}</td>
                                    <td className="py-1.5 text-right font-mono tabular-nums">{row.resolved}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div ref={containerRef} className="relative">
                    <svg
                        width={width}
                        height={HEIGHT}
                        role="img"
                        aria-label="Line chart of concerns submitted and resolved per day. Use the left and right arrow keys to read each day."
                        tabIndex={0}
                        className="block max-w-full touch-pan-y rounded"
                        onPointerMove={onPointerMove}
                        onPointerLeave={() => setActive(null)}
                        onKeyDown={onKeyDown}
                        onBlur={() => setActive(null)}
                    >
                        {yTicks.map((tick) => (
                            <g key={tick}>
                                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="#E3DED1" strokeWidth="1" />
                                <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-faint font-mono text-[10px]">
                                    {Number.isInteger(tick) ? tick : tick.toFixed(1)}
                                </text>
                            </g>
                        ))}

                        {xTicks.map(({ point: tickPoint, index }) => (
                            <text key={tickPoint.date} x={x(index)} y={HEIGHT - 6} textAnchor="middle" className="fill-faint font-mono text-[10px]">
                                {formatShortDate(`${tickPoint.date}T00:00`)}
                            </text>
                        ))}

                        {point && <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke="#4A5F86" strokeWidth="1" />}

                        {paths.map((path) => (
                            <path key={path.key} d={path.d} fill="none" stroke={path.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                        ))}

                        {point &&
                            SERIES.map((item) => (
                                <circle key={item.key} cx={x(active)} cy={y(point[item.key])} r="4.5" fill={item.color} stroke="#FBFAF6" strokeWidth="2" />
                            ))}
                    </svg>

                    {point && (
                        <div
                            className="pointer-events-none absolute top-0 z-10 w-36 -translate-x-1/2 rounded-md bg-ink-950 px-3 py-2 text-xs text-paper shadow-lg"
                            style={{ left: tooltipLeft }}
                            role="status"
                        >
                            <p className="font-mono text-2xs text-ink-300">{formatShortDate(`${point.date}T00:00`)}</p>
                            {SERIES.map((item) => (
                                <p key={item.key} className="mt-1 flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full ring-1 ring-ink-950" style={{ background: item.color }} aria-hidden="true" />
                                        {item.label}
                                    </span>
                                    <span className="font-mono tabular-nums">{point[item.key]}</span>
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
