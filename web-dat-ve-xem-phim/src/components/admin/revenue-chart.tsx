'use client';

import { useMemo, useState } from 'react';

type RevenuePoint = {
    key: string;
    label: string;
    revenue: number;
};

type RevenueChartProps = {
    data: RevenuePoint[];
};

const WIDTH = 720;
const HEIGHT = 260;
const PADDING = {
    top: 24,
    right: 20,
    bottom: 42,
    left: 20,
};
const VND = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

export function RevenueChart({ data }: RevenueChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const formatCurrency = (value: number) => VND.format(value);
    const maxRevenue = Math.max(...data.map((point) => point.revenue), 1);
    const chartWidth = WIDTH - PADDING.left - PADDING.right;
    const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const points = data.map((point, index) => {
        const x = PADDING.left +
            (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
        const y = PADDING.top + chartHeight - (point.revenue / maxRevenue) * chartHeight;
        return { ...point, x, y };
    });
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath = `${linePath} L ${points.at(-1)?.x ?? PADDING.left} ${HEIGHT - PADDING.bottom} L ${points[0]?.x ?? PADDING.left} ${HEIGHT - PADDING.bottom} Z`;
    const totalRevenue = useMemo(
        () => data.reduce((total, point) => total + point.revenue, 0),
        [data],
    );
    const averageRevenue = data.length > 0 ? totalRevenue / data.length : 0;
    const activePoint = activeIndex === null ? null : points[activeIndex];

    return (
        <div>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                    <p className="text-xs text-slate-400">Tổng 7 ngày</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-200">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3">
                    <p className="text-xs text-slate-400">Trung bình / ngày</p>
                    <p className="mt-1 text-lg font-semibold text-sky-200">{formatCurrency(averageRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
                    <p className="text-xs text-slate-400">Ngày cao nhất</p>
                    <p className="mt-1 text-lg font-semibold text-violet-200">
                        {formatCurrency(Math.max(...data.map((point) => point.revenue), 0))}
                    </p>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-2 sm:p-4">
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="h-auto min-h-[220px] w-full"
                    role="img"
                    aria-label="Biểu đồ doanh thu 7 ngày gần nhất"
                >
                    <defs>
                        <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[0, 0.5, 1].map((ratio) => {
                        const y = PADDING.top + chartHeight * ratio;
                        return <line key={ratio} x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke="rgba(148,163,184,0.15)" />;
                    })}
                    <path d={areaPath} fill="url(#revenue-area)" />
                    <path d={linePath} fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                    {points.map((point, index) => (
                        <g key={point.key}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={activeIndex === index ? 7 : 5}
                                fill="#0f172a"
                                stroke="#6ee7b7"
                                strokeWidth="3"
                                onMouseEnter={() => setActiveIndex(index)}
                                onFocus={() => setActiveIndex(index)}
                                tabIndex={0}
                                role="button"
                                aria-label={`${point.label}: ${formatCurrency(point.revenue)}`}
                            />
                            <text x={point.x} y={HEIGHT - 14} textAnchor="middle" className="fill-slate-400 text-[11px]">
                                {point.label}
                            </text>
                        </g>
                    ))}
                </svg>
                {activePoint ? (
                    <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-xl border border-emerald-300/30 bg-slate-900/95 px-3 py-2 text-center shadow-xl">
                        <p className="text-xs text-slate-400">{activePoint.label}</p>
                        <p className="text-sm font-semibold text-emerald-200">{formatCurrency(activePoint.revenue)}</p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
